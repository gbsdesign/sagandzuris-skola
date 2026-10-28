"""Keeps the „წიგნები“ tab in step with the „საღვთისმსახურო წიგნები“ app (com.duru.duru).

The app gets its corrections as Expo „over the air“ updates: a new JavaScript bundle (Hermes bytecode) that holds all
of its texts. This script asks the app's update server whether there is one newer than state.json, downloads it,
checks its hash, rebuilds public/wignebi + src/data/wignebi.ts from it (build.py) in a scratch folder, compares the
result with what the site has, and only then puts it in place and records the update in state.json.

  python3 scripts/wignebi/update.py                 check the server; apply a newer update if there is one
  python3 scripts/wignebi/update.py --bundle FILE   apply a bundle at hand (e.g. from a newer APK of the app)
  python3 scripts/wignebi/update.py --dry-run       check and build, change nothing

Run daily by .github/workflows/wignebi-update.yml, which commits the change straight to main.
Nothing is written when a book would lose items or more than a small share of its text (the run fails instead,
so a broken update never reaches the site)."""
import base64, hashlib, json, os, re, shutil, sys, tempfile, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402

REPO = build.REPO
STATE = os.path.join(HERE, 'state.json')
PUB = os.path.join(REPO, 'public', 'wignebi')
MENU = os.path.join(REPO, 'src', 'data', 'wignebi.ts')
PROJECT = '1b8790ea-dbaf-4a5b-8039-996537063e9d'          # the app's EAS project (its app.config: extra.eas.projectId)
SERVER = 'https://u.expo.dev/' + PROJECT
UA = 'sagandzuri-wignebi-update/1'                         # the server refuses Python's default user agent
MAX_LOSS = 0.03                                            # a book may lose at most 3% of its text in one update


def get(url, headers):
    req = urllib.request.Request(url, headers={'user-agent': UA, **headers})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status, r.headers.get('content-type', ''), r.read()


def manifest(runtime):
    """the newest update for one runtime version (= the app's version), or None"""
    status, ctype, body = get(SERVER, {
        'expo-runtime-version': runtime, 'expo-platform': 'android', 'expo-channel-name': 'production',
        'expo-protocol-version': '1', 'accept': 'multipart/mixed'})
    if status == 204 or not body:
        return None
    parts = {}
    m = re.search(r'boundary=("?)([^";]+)\1', ctype)
    chunks = body.split(b'--' + m.group(2).encode()) if m else [body]
    for ch in chunks:
        head, _, data = ch.partition(b'\r\n\r\n')
        name = re.search(rb'name="([^"]+)"', head)
        if name:
            parts[name.group(1).decode()] = json.loads(data.strip())
    if 'manifest' not in parts and 'createdAt' in (json.loads(body) if body.strip().startswith(b'{') else {}):
        parts['manifest'] = json.loads(body)
    man = parts.get('manifest')
    if not man:
        return None
    man['_headers'] = (parts.get('extensions') or {}).get('assetRequestHeaders', {})
    return man


def runtimes(current):
    """the app's own version and the next few it might move to (its runtime version follows the app's version)"""
    a, b, c = (int(x) for x in current.split('.'))
    return [current, f'{a}.{b}.{c + 1}', f'{a}.{b}.{c + 2}', f'{a}.{b + 1}.0', f'{a + 1}.0.0']


def download(man, path):
    la = man['launchAsset']
    status, _, data = get(la['url'], man['_headers'].get(la['key'], {}))
    want = la.get('hash')
    got = base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip('=')
    if want and got != want:
        raise SystemExit(f'the downloaded bundle does not match its hash ({got} ≠ {want})')
    with open(path, 'wb') as f:
        f.write(data)


def site_stats():
    """what the site has now: {collection: (files, characters)}"""
    out = {}
    if not os.path.isdir(PUB):
        return out
    for coll in os.listdir(PUB):
        d = os.path.join(PUB, coll)
        if os.path.isdir(d):
            fs = [f for f in os.listdir(d) if f.endswith('.json')]
            out[coll] = (len(fs), sum(len(open(os.path.join(d, f), encoding='utf-8').read()) for f in fs))
    return out


def check(old, new):
    problems = []
    for coll, (n0, c0) in old.items():
        if coll not in new:
            problems.append(f'{coll}: missing'); continue
        n1, c1 = new[coll]
        if n1 < n0: problems.append(f'{coll}: {n0} → {n1} items')
        if c1 < c0 * (1 - MAX_LOSS): problems.append(f'{coll}: text {c0} → {c1} characters')
    return problems


def changed_files(tmp):
    """files that differ between the scratch build and the site, as paths under public/wignebi"""
    out = []
    new = os.path.join(tmp, 'public', 'wignebi')
    for coll in sorted(os.listdir(new)):
        names = set(os.listdir(os.path.join(new, coll)))
        old = set(os.listdir(os.path.join(PUB, coll))) if os.path.isdir(os.path.join(PUB, coll)) else set()
        for f in sorted(names | old):
            a, b = os.path.join(PUB, coll, f), os.path.join(new, coll, f)
            if not (os.path.exists(a) and os.path.exists(b) and open(a, 'rb').read() == open(b, 'rb').read()):
                out.append(f'{coll}/{f}')
    return out


def apply(tmp):
    new = os.path.join(tmp, 'public', 'wignebi')
    for coll in os.listdir(new):
        dst = os.path.join(PUB, coll)
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        shutil.copytree(os.path.join(new, coll), dst)
    shutil.copyfile(os.path.join(tmp, 'src', 'data', 'wignebi.ts'), MENU)


def main(argv):
    dry = '--dry-run' in argv
    state = json.load(open(STATE, encoding='utf-8'))
    with tempfile.TemporaryDirectory() as tmp:
        bundle = os.path.join(tmp, 'bundle.hbc')
        if '--bundle' in argv:
            shutil.copyfile(argv[argv.index('--bundle') + 1], bundle)
            update = {'runtimeVersion': state['runtimeVersion'], 'updateId': None, 'createdAt': None,
                      'source': os.path.basename(argv[argv.index('--bundle') + 1])}
        else:
            found = []
            for rt in runtimes(state['runtimeVersion']):
                try:
                    man = manifest(rt)
                except urllib.error.HTTPError as e:
                    print(f'runtime {rt}: HTTP {e.code}'); continue
                print(f'runtime {rt}: ' + (f"update {man['id']} of {man['createdAt']}" if man else 'none'))
                if man:
                    found.append(man)
            newer = [m for m in found if m['createdAt'] > (state.get('createdAt') or '')
                     and m['id'] != state.get('updateId')]
            if not newer:
                print('nothing new — the site has the app\'s latest texts'); return 0
            man = max(newer, key=lambda m: m['createdAt'])
            download(man, bundle)
            update = {'runtimeVersion': man['runtimeVersion'], 'updateId': man['id'], 'createdAt': man['createdAt'],
                      'source': 'update server'}
        print('building from', update)
        new = build.build(bundle, tmp)
        old = site_stats()
        problems = check(old, new)
        if problems:
            print('NOT applied — the update would lose texts:\n  ' + '\n  '.join(problems))
            return 1
        files = changed_files(tmp)
        print(f'{len(files)} files change' + (': ' + ', '.join(files[:40]) + (' …' if len(files) > 40 else '') if files else ''))
        if dry:
            return 0
        apply(tmp)
    state.update({k: v for k, v in update.items() if k != 'source'})
    state.pop('files', None)
    state['changedFiles'] = len(files)
    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=1); f.write('\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(f"### წიგნები: განახლება {update.get('createdAt') or update['source']}\n\n{len(files)} ფაილი შეიცვალა\n\n"
                    + ''.join(f'- `{x}`\n' for x in files[:200]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
