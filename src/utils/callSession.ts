import { useEffect, useState, useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// The school's own calls: a private chat's (dms/{id}) and a class's (classes/{id}), audio or video, through
// Cloudflare Realtime (an SFU: each phone sends its microphone and camera once and receives the others').
// The Worker worker/calls/calls.js holds the secret; Firestore keeps who is in the call:
//   {base}/peers/{uid} — name, photo, the Realtime session and track names, mic/cam on, a heartbeat (at)
// A private call rings through dms/{id}.callAt/callBy/callKind (ended: callEnd); a class's through
// classes/{id}/call/state. One call at a time; the call screen (components/calls/CallLayer) shows this store.

export const CALLS_URL = 'https://sagandzuri-calls.mr-gabunia.workers.dev';

export type CallKind = 'audio' | 'video';

export interface Peer {
  uid: string;
  name: string;
  photoURL: string;
  /** an admin answering an administration chat (the member sees only „ადმინისტრაცია“) */
  staff: boolean;
  mic: boolean;
  cam: boolean;
  session: string;
  audio: string;
  video: string;
  at: number;
}

export interface RemotePeer extends Peer {
  stream: MediaStream | null;
}

export interface CallInfo {
  /** classes/{id} or dms/{id} */
  base: string;
  title: string;
  /** a private chat (the call ends when the other side leaves or does not answer) */
  oneToOne: boolean;
  /** the camera may be used (never in an administration chat) */
  canVideo: boolean;
  /** this side shows admins as „ადმინისტრაცია“ */
  anonStaff: boolean;
  me: { uid: string; name: string; photoURL: string; staff: boolean };
  /** a class's teachers: their video is always received */
  leaders?: string[];
}

// Picture quality: a private call in HD; a class's call lighter, and each phone receives at most a few videos
// (the others are heard and shown by their photo), so a big class does not freeze phones or slow connections.
const MAX_VIDEOS = 6;
const videoConstraints = (oneToOne: boolean, facing: 'user' | 'environment'): MediaTrackConstraints => (oneToOne
  ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }
  : { facingMode: facing, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 24 } });
const sendLimits = (oneToOne: boolean) => (oneToOne
  ? { maxBitrate: 1_800_000, maxFramerate: 30 }
  : { maxBitrate: 550_000, maxFramerate: 24 });

export interface CallState {
  info: CallInfo | null;
  status: 'idle' | 'connecting' | 'waiting' | 'live' | 'ended';
  /** why the call ended or could not start */
  note: string;
  mic: boolean;
  cam: boolean;
  facing: 'user' | 'environment';
  local: MediaStream | null;
  peers: RemotePeer[];
  speaking: string[];
  since: number;
  /** shrunk to a bar at the bottom */
  small: boolean;
  /** a short notice over the controls (e.g. the camera could not start) */
  hint: string;
}

const IDLE: CallState = {
  info: null, status: 'idle', note: '', mic: true, cam: false, facing: 'user', local: null, peers: [], speaking: [], since: 0, small: false, hint: '',
};

// why a camera did not start, in words
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cameraTrouble = (e: any) =>
  e?.name === 'NotAllowedError' ? 'კამერაზე წვდომა არ არის — ნება დართეთ ბრაუზერის პარამეტრებში (🔒 მისამართის გვერდით).'
    : e?.name === 'NotReadableError' || e?.name === 'AbortError' ? 'კამერა სხვა ფანჯარას ან პროგრამას უკავია — დახურეთ ის და სცადეთ თავიდან.'
    : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError' ? 'კამერა ვერ მოიძებნა.'
    : 'კამერა ვერ ჩაირთო.';

let hintTimer = 0;
const showHint = (hint: string) => {
  set({ hint });
  clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => set({ hint: '' }), 6000);
};

let state: CallState = IDLE;
const listeners = new Set<() => void>();
const set = (patch: Partial<CallState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const useCall = () => useSyncExternalStore(subscribe, () => state);
export const callState = () => state;

// ---- Firestore: who is in a call ----------------------------------------------------------------------------

const FRESH_MS = 50_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPeer = (d: any): Peer => ({
  uid: d.uid || '', name: d.name || '', photoURL: d.photoURL || '', staff: !!d.staff, mic: d.mic !== false, cam: !!d.cam,
  session: d.session || '', audio: d.audio || '', video: d.video || '', at: d.at?.toMillis?.() ?? Date.now(),
});
const fresh = (p: Peer) => Date.now() - p.at < FRESH_MS;

/** Who is in the call of a chat or a class now (live); empty when nobody. */
export const useLivePeers = (base: string | null | undefined) => {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!base) { setPeers([]); return; }
    const off = onSnapshot(
      collection(db, base, 'peers'),
      s => setPeers(s.docs.map(d => toPeer(d.data({ serverTimestamps: 'estimate' })))),
      err => { console.warn('call peers: ', err?.code || err); setPeers([]); }
    );
    // a phone that closed without saying goodbye drops out once its heartbeat is old
    const t = setInterval(() => tick(n => n + 1), 15_000);
    return () => { off(); clearInterval(t); };
  }, [base]);
  return peers.filter(fresh);
};

// ---- the Worker ---------------------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = async (path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<any> => {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch(CALLS_URL + path, {
    method,
    headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.errorCode) throw new Error(data?.errorDescription || data?.error || `calls ${r.status}`);
  return data;
};

// ---- one call -----------------------------------------------------------------------------------------------

class Call {
  pc!: RTCPeerConnection;
  session = '';
  info: CallInfo;
  local: MediaStream;
  audioName = '';
  videoName = '';
  /** what was pulled: "uid:trackName" → mid */
  pulled = new Map<string, string>();
  midOwner = new Map<string, string>();
  failed = new Map<string, number>();
  streams = new Map<string, MediaStream>();
  others: Peer[] = [];
  queue: Promise<unknown> = Promise.resolve();
  offPeers: (() => void) | null = null;
  offEnd: (() => void) | null = null;
  timers: number[] = [];
  everJoined = false;
  closed = false;
  audioCtx: AudioContext | null = null;
  meters = new Map<string, AnalyserNode>();

  constructor(info: CallInfo, local: MediaStream) {
    this.info = info;
    this.local = local;
  }

  /** one exchange with Realtime at a time */
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }

  async start() {
    const { iceServers } = await api('/ice', 'GET');
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
    this.pc.ontrack = e => {
      const owner = this.midOwner.get(e.transceiver.mid || '');
      if (!owner) return;
      let s = this.streams.get(owner);
      if (!s) { s = new MediaStream(); this.streams.set(owner, s); }
      s.getTracks().filter(t => t.kind === e.track.kind).forEach(t => s!.removeTrack(t));
      s.addTrack(e.track);
      if (e.track.kind === 'audio') this.meter(owner, s);
      this.publishPeers();
    };
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed' && !this.closed) leaveCall('კავშირი გაწყდა.');
    };
    this.session = (await api('/sessions/new', 'POST')).sessionId;
    for (const t of this.local.getTracks()) await this.push(t);
    await this.connected();
    await this.writeMe();
    this.timers.push(window.setInterval(() => { this.writeMe().catch(() => {}); this.sync(); }, 15_000));
    this.offPeers = onSnapshot(collection(db, this.info.base, 'peers'), s => {
      this.others = s.docs.map(d => toPeer(d.data({ serverTimestamps: 'estimate' }))).filter(p => p.uid !== this.info.me.uid);
      this.sync();
    });
    this.timers.push(window.setInterval(() => this.measure(), 300));
  }

  connected() {
    return new Promise<void>(resolve => {
      const ok = () => this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed';
      if (ok()) return resolve();
      const t = window.setTimeout(resolve, 8000);
      this.pc.addEventListener('iceconnectionstatechange', () => { if (ok()) { clearTimeout(t); resolve(); } });
    });
  }

  /** send one's microphone or camera */
  push(track: MediaStreamTrack) {
    return this.run(async () => {
      const tr = this.pc.addTransceiver(track, { direction: 'sendonly' });
      await this.pc.setLocalDescription(await this.pc.createOffer());
      const r = await api(`/sessions/${this.session}/tracks/new`, 'POST', {
        sessionDescription: { type: 'offer', sdp: this.pc.localDescription!.sdp },
        tracks: [{ location: 'local', mid: tr.mid, trackName: track.id }],
      });
      await this.pc.setRemoteDescription(r.sessionDescription);
      if (track.kind === 'audio') this.audioName = track.id; else this.videoName = track.id;
      if (track.kind === 'video') {
        // a clear picture from the start, but never more than the call can carry
        try {
          const p = tr.sender.getParameters();
          if (!p.encodings?.length) p.encodings = [{}];
          Object.assign(p.encodings[0], sendLimits(this.info.oneToOne));
          await tr.sender.setParameters(p);
        } catch { /* the browser's own limits stay */ }
      }
    });
  }

  /** whose video this phone receives: everyone in a private call; in a class, the teachers first, up to MAX_VIDEOS */
  videoFrom(live: Peer[]) {
    if (this.info.oneToOne) return new Set(live.filter(p => p.video).map(p => p.uid));
    const withCam = live.filter(p => p.video && p.cam);
    const lead = this.info.leaders || [];
    const order = [...withCam].sort((a, b) =>
      Number(lead.includes(b.uid)) - Number(lead.includes(a.uid)) || a.uid.localeCompare(b.uid));
    return new Set(order.slice(0, MAX_VIDEOS).map(p => p.uid));
  }

  /** receive the others' tracks; let go of those who left */
  sync() {
    if (this.closed) return;
    const live = this.others.filter(p => fresh(p) && p.session);
    if (live.length) this.everJoined = true;
    const seeVideo = this.videoFrom(live);
    const wanted = new Set<string>();
    for (const p of live) {
      const names = [p.audio, seeVideo.has(p.uid) ? p.video : ''].filter(Boolean);
      names.forEach(n => wanted.add(`${p.uid}:${n}`));
      const want = names.filter(n => !this.pulled.has(`${p.uid}:${n}`));
      const retry = want.filter(n => (this.failed.get(`${p.uid}:${n}`) ?? 0) < Date.now());
      if (retry.length) this.pull(p, retry).catch(e => console.warn('call pull: ', e));
    }
    // those who left, and videos no longer received (a class's 7th camera, a camera turned off)
    const gone = [...this.pulled.keys()].filter(k => !wanted.has(k));
    if (gone.length) this.drop(gone);
    this.publishPeers();
    // a private call ends when the other side has left
    if (this.info.oneToOne && this.everJoined && live.length === 0) leaveCall('ზარი დასრულდა.');
  }

  pull(p: Peer, names: string[]) {
    names.forEach(n => this.pulled.set(`${p.uid}:${n}`, ''));
    return this.run(async () => {
      try {
        const r = await api(`/sessions/${this.session}/tracks/new`, 'POST', {
          tracks: names.map(n => ({ location: 'remote', sessionId: p.session, trackName: n })),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r.tracks || []).forEach((t: any, i: number) => {
          const key = `${p.uid}:${names[i]}`;
          if (t.errorCode || !t.mid) {
            this.pulled.delete(key);
            this.failed.set(key, Date.now() + 4000);
            window.setTimeout(() => this.sync(), 4500);
            return;
          }
          this.pulled.set(key, t.mid);
          this.midOwner.set(t.mid, p.uid);
        });
        if (r.requiresImmediateRenegotiation) {
          await this.pc.setRemoteDescription(r.sessionDescription);
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await api(`/sessions/${this.session}/renegotiate`, 'PUT', { sessionDescription: { type: 'answer', sdp: answer.sdp } });
        }
      } catch (e) {
        names.forEach(n => { this.pulled.delete(`${p.uid}:${n}`); this.failed.set(`${p.uid}:${n}`, Date.now() + 4000); });
        // try again soon (the other side may still be connecting)
        window.setTimeout(() => this.sync(), 4500);
        throw e;
      }
    });
  }

  drop(keys: string[]) {
    const mids = keys.map(k => this.pulled.get(k)).filter((m): m is string => !!m);
    // a video no longer received leaves its tile (the photo shows instead of a frozen picture)
    mids.forEach(mid => {
      const owner = this.midOwner.get(mid);
      const track = this.pc.getTransceivers().find(t => t.mid === mid)?.receiver.track;
      if (owner && track) this.streams.get(owner)?.removeTrack(track);
      this.midOwner.delete(mid);
    });
    keys.forEach(k => {
      this.pulled.delete(k);
      const uid = k.slice(0, k.indexOf(':'));
      if (![...this.pulled.keys()].some(x => x.startsWith(`${uid}:`))) { this.streams.delete(uid); this.meters.delete(uid); }
    });
    if (mids.length) {
      this.run(() => api(`/sessions/${this.session}/tracks/close`, 'PUT', { tracks: mids.map(mid => ({ mid })), force: true }))
        .catch(e => console.warn('call close: ', e));
    }
  }

  publishPeers() {
    if (this.closed) return;
    const peers = this.others.filter(p => fresh(p) && p.session)
      .map(p => ({ ...p, stream: this.streams.get(p.uid) || null }));
    set({ peers, status: peers.length ? 'live' : this.everJoined ? 'live' : 'waiting' });
  }

  meter(uid: string, s: MediaStream) {
    try {
      this.audioCtx ??= new AudioContext();
      const a = this.audioCtx.createAnalyser();
      a.fftSize = 256;
      this.audioCtx.createMediaStreamSource(s).connect(a);
      this.meters.set(uid, a);
    } catch { /* no meter: no ring around the speaker */ }
  }

  measure() {
    const buf = new Uint8Array(128);
    const speaking: string[] = [];
    this.meters.forEach((a, uid) => {
      a.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      if (peak > 12) speaking.push(uid);
    });
    if (speaking.join() !== state.speaking.join()) set({ speaking });
  }

  writeMe() {
    const { me, base } = this.info;
    return setDoc(doc(db, base, 'peers', me.uid), {
      uid: me.uid, name: me.name, photoURL: me.photoURL, staff: me.staff,
      session: this.session, audio: this.audioName, video: this.videoName,
      mic: state.mic, cam: state.cam, at: serverTimestamp(),
    });
  }

  close() {
    this.closed = true;
    this.timers.forEach(t => clearInterval(t));
    this.offPeers?.();
    this.offEnd?.();
    this.local.getTracks().forEach(t => t.stop());
    try { this.pc?.close(); } catch { /* closed */ }
    this.audioCtx?.close().catch(() => {});
    return deleteDoc(doc(db, this.info.base, 'peers', this.info.me.uid)).catch(() => {});
  }
}

let current: Call | null = null;

// closing the tab or the app leaves the call at once (instead of the others waiting for the heartbeat to grow old)
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (current) leaveCall(); });
}

const camera = (facing: 'user' | 'environment') =>
  navigator.mediaDevices.getUserMedia({ video: videoConstraints(!!current?.info.oneToOne, facing) });

/**
 * Joins (or starts) the call of a chat or a class. Resolves once connected, or with the reason it could not.
 * `ring` (a private call one is starting): the other side is rung through the chat's document by the caller.
 */
export const joinCall = async (info: CallInfo, kind: CallKind): Promise<boolean> => {
  if (current) {
    if (current.info.base === info.base) return true;
    await leaveCall();
  }
  const video = kind === 'video' && info.canVideo;
  set({ ...IDLE, info, status: 'connecting', cam: video, since: Date.now() });
  let local: MediaStream;
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('insecure'), { name: 'Insecure' });
    try {
      local = await navigator.mediaDevices.getUserMedia({
        audio,
        video: video ? videoConstraints(info.oneToOne, 'user') : false,
      });
    } catch (e) {
      // the camera would not start: the call goes on by voice, and says why
      if (!video) throw e;
      local = await navigator.mediaDevices.getUserMedia({ audio });
      showHint(cameraTrouble(e));
    }
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (e as any)?.name;
    set({
      status: 'ended',
      note: name === 'Insecure' ? 'ზარი მხოლოდ საიტის https მისამართზე მუშაობს (sagandzuris-skola.pages.dev).'
        : name === 'NotAllowedError' ? 'მიკროფონზე წვდომა არ არის. ნება დართეთ ბრაუზერის პარამეტრებში.'
        : name === 'NotReadableError' ? 'მიკროფონი სხვა პროგრამას უკავია.'
        : 'მიკროფონი ვერ ჩაირთო.',
    });
    return false;
  }
  const call = new Call(info, local);
  current = call;
  set({ local, cam: local.getVideoTracks().length > 0 });
  try {
    await call.start();
    if (current !== call) return false;
    set({ status: state.peers.length ? 'live' : 'waiting' });
    return true;
  } catch (e) {
    console.warn('call: ', e);
    if (current === call) {
      current = null;
      await call.close();
      set({ status: 'ended', note: 'ზარი ვერ დაიწყო. სცადეთ ცოტა ხანში.' });
    }
    return false;
  }
};

/** Leaves the call (the screen shows `note` for a moment, if given). */
export const leaveCall = async (note = '') => {
  const call = current;
  current = null;
  if (call) await call.close();
  set({ ...IDLE, status: note ? 'ended' : 'idle', note, info: note ? state.info : null });
};

/** Hides the "ended" note. */
export const dismissCall = () => { if (!current) set(IDLE); };

/** the call screen shrinks to a small bar (to read the chat during the call) or opens again */
export const setCallSmall = (small: boolean) => set({ small });

/** Watches the chat's document while in its call: `ended` says the other side declined or hung up. */
export const watchEnd = (base: string, ended: (data: Record<string, unknown>) => boolean, path: string) => {
  const call = current;
  if (!call || call.info.base !== base) return;
  call.offEnd = onSnapshot(doc(db, path), s => {
    if (current === call && s.exists() && ended(s.data({ serverTimestamps: 'estimate' }))) leaveCall(call.everJoined ? 'ზარი დასრულდა.' : 'ზარს არ უპასუხეს.');
  });
};

/** A private call nobody answered stops by itself. */
export const giveUpAfter = (ms: number, onGiveUp: () => void) => {
  const call = current;
  if (!call) return;
  call.timers.push(window.setTimeout(() => {
    if (current === call && !call.everJoined) { onGiveUp(); leaveCall('ზარს არ უპასუხეს.'); }
  }, ms));
};

export const toggleMic = () => {
  if (!current) return;
  const on = !state.mic;
  current.local.getAudioTracks().forEach(t => { t.enabled = on; });
  set({ mic: on });
  current.writeMe().catch(() => {});
};

export const toggleCam = async () => {
  const call = current;
  if (!call || !call.info.canVideo) return;
  const track = call.local.getVideoTracks()[0];
  if (track) {
    track.enabled = !state.cam;
    set({ cam: !state.cam });
  } else {
    // an audio call turning the camera on: send a camera now
    try {
      const v = (await camera(state.facing)).getVideoTracks()[0];
      call.local.addTrack(v);
      await call.push(v);
      set({ cam: true, local: new MediaStream(call.local.getTracks()) });
    } catch (e) {
      console.warn('call camera: ', e);
      showHint(cameraTrouble(e));
      return;
    }
  }
  call.writeMe().catch(() => {});
};

export const flipCamera = async () => {
  const call = current;
  const old = call?.local.getVideoTracks()[0];
  if (!call || !old) return;
  const facing = state.facing === 'user' ? 'environment' : 'user';
  try {
    const v = (await camera(facing)).getVideoTracks()[0];
    const sender = call.pc.getSenders().find(s => s.track === old);
    await sender?.replaceTrack(v);
    call.local.removeTrack(old);
    old.stop();
    v.enabled = state.cam;
    call.local.addTrack(v);
    set({ facing, local: new MediaStream(call.local.getTracks()) });
  } catch (e) {
    console.warn('call flip: ', e);
    showHint(cameraTrouble(e));
  }
};

// ---- ringing ------------------------------------------------------------------------------------------------

/** Marks a private chat's call ended (it was started with notePrivateCall, hooks/useDirectChat). */
export const endChatCall = (id: string) => updateDoc(doc(db, 'dms', id), { callEnd: serverTimestamp() });

/** A class's call started (members see „ზარი მიმდინარეობს“) or ended. */
export const ringClass = (classId: string, me: { uid: string; name: string }, kind: CallKind) =>
  setDoc(doc(db, 'classes', classId, 'call', 'state'), { at: serverTimestamp(), by: me.uid, name: me.name, kind, end: null });
export const endClassCall = (classId: string) =>
  updateDoc(doc(db, 'classes', classId, 'call', 'state'), { end: serverTimestamp() });

/** A call notice is fresh this long (then it no longer rings). */
export const RING_MS = 45_000;
