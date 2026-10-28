"""Reads the texts out of the „საღვთისმსახურო წიგნები“ app's JavaScript bundle.

The app is built with Expo / React Native, so its code ships as Hermes bytecode (version 98). The books are plain
data modules there: one module per book that builds a big object of class instances (titles[], texts[][]) and
exports it (`TvenidataData`, `JamniData`, …). This file knows just enough of the bytecode to rebuild those objects:

  HBC          the file's header and tables (strings, literal buffers, object shapes)
  disasm       one function's instructions (opcode table: ops.txt, Hermes v98 = static_h BytecodeList.def without
               CreatePrivateName and NewTypedObjectWithBuffer, with CacheNewObject at index 15)
  Ev.run       a tiny evaluator that follows a module function's straight-line code and keeps the objects it builds
  find_module  the function that defines a given export (found by its name string, then checked by running it)

Nothing here runs the app's code for real; unknown operations simply give `Unk` values."""
import bisect, collections, os, re, struct

HERE = os.path.dirname(os.path.abspath(__file__))
VERSION = 98


def _al(x):
    return (x + 3) & ~3


class HBC:
    def __init__(self, path):
        d = self.d = open(path, 'rb').read()
        if d[:8] != bytes.fromhex('c61fbc03c103191f'):
            raise SystemExit(f'{path}: not a Hermes bytecode file')
        version, = struct.unpack_from('<I', d, 8)
        if version != VERSION:
            raise SystemExit(f'{path}: Hermes bytecode v{version}, this reader knows v{VERSION} (ops.txt)')
        names = ['fileLength', 'globalCodeIndex', 'functionCount', 'stringKindCount', 'identifierCount', 'stringCount',
                 'overflowStringCount', 'stringStorageSize', 'bigIntCount', 'bigIntStorageSize', 'regExpCount',
                 'regExpStorageSize', 'literalValueBufferSize', 'objKeyBufferSize', 'objShapeTableCount',
                 'numStringSwitchImms', 'segmentID', 'cjsModuleCount', 'functionSourceCount', 'debugInfoOffset']
        self.h = h = dict(zip(names, struct.unpack_from('<20I', d, 32)))
        p = 128
        self.funcHdrOff = p; p = _al(p + h['functionCount'] * 12)
        p = _al(p + h['stringKindCount'] * 4)
        p = _al(p + h['identifierCount'] * 4)
        self.sstOff = p; p = _al(p + h['stringCount'] * 4)
        self.ostOff = p; p = _al(p + h['overflowStringCount'] * 8)
        self.storOff = p; p = _al(p + h['stringStorageSize'])
        self.litOff = p; p = _al(p + h['literalValueBufferSize'])
        self.keyOff = p; p = _al(p + h['objKeyBufferSize'])
        self.shapeOff = p; p = _al(p + h['objShapeTableCount'] * 8)

    def strings(self):
        d = self.d; out = []
        for i in range(self.h['stringCount']):
            e, = struct.unpack_from('<I', d, self.sstOff + 4 * i)
            utf16 = e & 1; off = (e >> 1) & 0x7fffff; ln = e >> 24
            if ln == 0xff:
                off, ln = struct.unpack_from('<II', d, self.ostOff + 8 * off)
            b = self.storOff + off
            out.append(d[b:b + 2 * ln].decode('utf-16-le', 'surrogatepass') if utf16 else d[b:b + ln].decode('latin-1'))
        return out


def func_headers(H):
    d = H.d; out = []
    for i in range(H.h['functionCount']):
        p = H.funcHdrOff + 12 * i
        w1, w2, b1, b2, b3, fl = struct.unpack_from('<IIBBBB', d, p)
        f = dict(offset=w1 & 0x1ffffff, size=w2 & 0x3fff, frameSize=b1)
        if fl & 0x20:                                  # overflowed: the real header is elsewhere
            lo = ((w2 >> 14) & 0xff) << 24 | (w1 & 0xffffff)
            v = struct.unpack_from('<8I4B', d, lo)
            f = dict(offset=v[0], size=v[3], frameSize=v[7])
        out.append(f)
    return out


def read_lits(H, base, off, n):
    """n values of a literal buffer (the buffers overlap, so they are read from the offset an instruction gives)"""
    d = H.d; p = base + off; out = []
    while len(out) < n:
        t = d[p]; p += 1
        if t & 0x80:
            ln = ((t & 0x0f) << 8) | d[p]; p += 1
        else:
            ln = t & 0x0f
        tag = t & 0x70
        for _ in range(ln):
            if tag == 0x00: out.append(None)
            elif tag == 0x10: out.append(True)
            elif tag == 0x20: out.append(False)
            elif tag == 0x30: out.append(struct.unpack_from('<d', d, p)[0]); p += 8
            elif tag == 0x40: out.append(('S', struct.unpack_from('<I', d, p)[0])); p += 4
            elif tag == 0x50: out.append(('S', struct.unpack_from('<H', d, p)[0])); p += 2
            elif tag == 0x60: out.append(('U', None))
            elif tag == 0x70: out.append(struct.unpack_from('<i', d, p)[0]); p += 4
    return out[:n]


SZ = dict(Reg8=1, Reg32=4, UInt8=1, UInt16=2, UInt32=4, Addr8=1, Addr32=4, Imm32=4, Double=8)
FMT = dict(Reg8='B', Reg32='I', UInt8='B', UInt16='H', UInt32='I', Addr8='b', Addr32='i', Imm32='i', Double='d')


def load_ops(path=os.path.join(HERE, 'ops.txt')):
    ops = []
    for line in open(path):
        p = line.split()
        if p:
            ops.append((p[0], p[1:]))
    return ops


def disasm(d, off, size, ops):
    p = off; end = off + size; out = []
    while p < end:
        op = d[p]
        if op >= len(ops):
            return out, ('badop', p - off, op)
        name, args = ops[op]; q = p + 1; vals = []
        for a in args:
            vals.append(struct.unpack_from('<' + FMT[a], d, q)[0]); q += SZ[a]
        out.append((p - off, name, vals)); p = q
    return out, (None if p == end else ('overrun', p - end))


class Unk:
    def __init__(s, d): s.d = d
    def __repr__(s): return '<%s>' % s.d


class Arr(list): pass
class Obj(dict): pass


def _lit(S, x):
    if isinstance(x, tuple):
        return S[x[1]] if x[0] == 'S' and x[1] < len(S) else None
    return x


def _key(k):
    if isinstance(k, (int, float)) and not isinstance(k, bool) and float(k).is_integer():
        return str(int(k))
    return k if isinstance(k, str) else str(k)


class Ev:
    def __init__(s, H, ops=None):
        s.H = H; s.ops = ops or load_ops(); s.S = H.strings(); s.F = func_headers(H)
        s.shapes = [struct.unpack_from('<II', H.d, H.shapeOff + 8 * i) for i in range(H.h['objShapeTableCount'])]
        s.shapekeys = {}
        s._starts = None

    def keys(s, si):
        if si not in s.shapekeys:
            off, n = s.shapes[si]
            s.shapekeys[si] = [_key(_lit(s.S, x)) for x in read_lits(s.H, s.H.keyOff, off, n)]
        return s.shapekeys[si]

    def run(s, fi):
        """follows function fi; returns what it stored to its environment (a module's exports), its calls, …"""
        S = s.S; f = s.F[fi]
        ins, err = disasm(s.H.d, f['offset'], f['size'], s.ops)
        R = collections.defaultdict(lambda: Unk('?'))
        topreg = 0
        for o, n, v in ins:
            if (n in ('Mov', 'MovLong') or n.startswith(('LoadConst', 'NewArray', 'NewObject'))) and v:
                topreg = max(topreg, v[0])
        env = {}; puts = []; rets = []; calls = []
        for o, n, v in ins:
            try:
                if n in ('LoadConstString', 'LoadConstStringLongIndex'): R[v[0]] = S[v[1]]
                elif n in ('LoadConstUInt8', 'LoadConstInt', 'LoadConstDouble'): R[v[0]] = v[1]
                elif n == 'LoadConstZero': R[v[0]] = 0
                elif n == 'LoadConstUndefined': R[v[0]] = Unk('undefined')
                elif n == 'LoadConstNull': R[v[0]] = None
                elif n == 'LoadConstTrue': R[v[0]] = True
                elif n == 'LoadConstFalse': R[v[0]] = False
                elif n == 'LoadConstEmpty': R[v[0]] = Unk('empty')
                elif n in ('Mov', 'MovLong'): R[v[0]] = R[v[1]]
                elif n in ('NewArrayWithBuffer', 'NewArrayWithBufferLong'):
                    R[v[0]] = Arr(_lit(S, x) for x in read_lits(s.H, s.H.litOff, v[3], v[2]))
                elif n == 'NewArray': R[v[0]] = Arr()
                elif n == 'NewObject': R[v[0]] = Obj()
                elif n in ('NewObjectWithBuffer', 'NewObjectWithBufferLong'):
                    ks = s.keys(v[1]); vals = [_lit(S, x) for x in read_lits(s.H, s.H.litOff, v[2], len(ks))]
                    R[v[0]] = Obj(zip(ks, vals))
                elif n in ('PutOwnBySlotIdx', 'PutOwnBySlotIdxLong'):
                    ob = R[v[0]]
                    if isinstance(ob, Obj):
                        k = list(ob.keys())[v[2]] if v[2] < len(ob) else ('slot%d' % v[2])
                        ob[k] = R[v[1]]
                elif n in ('DefineOwnById', 'DefineOwnByIdLong', 'PutByIdLoose', 'PutByIdStrict', 'PutByIdLooseLong',
                           'PutByIdStrictLong'):
                    ob = R[v[0]]; k = S[v[3]]
                    if isinstance(ob, Obj): ob[k] = R[v[1]]
                    else: puts.append((repr(ob)[:30], k, R[v[1]]))
                elif n in ('DefineOwnByIndex', 'DefineOwnByIndexL', 'DefineOwnInDenseArray', 'DefineOwnInDenseArrayL'):
                    ob = R[v[0]]; idx = v[2]
                    if isinstance(ob, Arr):
                        while len(ob) <= idx: ob.append(Unk('hole'))
                        ob[idx] = R[v[1]]
                    elif isinstance(ob, Obj): ob[str(idx)] = R[v[1]]
                elif n == 'DefineOwnByVal':
                    ob = R[v[0]]; key = R[v[2]]
                    if isinstance(ob, Obj): ob[str(key)] = R[v[1]]
                    elif isinstance(ob, Arr) and isinstance(key, int):
                        while len(ob) <= key: ob.append(Unk('hole'))
                        ob[key] = R[v[1]]
                elif n in ('PutByValLoose', 'PutByValStrict'):
                    ob = R[v[0]]; key = R[v[1]]
                    if isinstance(ob, Obj): ob[str(key)] = R[v[2]]
                    else: puts.append((repr(ob)[:30], key, R[v[2]]))
                elif n in ('StoreToEnvironment', 'StoreToEnvironmentL', 'StoreNPToEnvironment', 'StoreNPToEnvironmentL'):
                    env[(v[0], v[1])] = R[v[2]]
                elif n == 'Ret': rets.append(R[v[0]])
                elif n in ('Construct', 'Call', 'Call1', 'Call2', 'Call3', 'Call4'):
                    if n in ('Construct', 'Call'):
                        args = [R[topreg - k] for k in range(v[2])]
                    else:
                        args = [R[x] for x in v[2:]]
                    callee = R[v[1]]
                    cname = callee.d if isinstance(callee, Unk) else repr(callee)[:20]
                    if n == 'Construct':
                        o_ = Obj(); o_['__new__'] = cname.replace('get:', ''); o_['args'] = Arr(args[1:]); R[v[0]] = o_
                    else:
                        R[v[0]] = Unk('call:' + cname); calls.append((cname, args))
                elif n == 'SelectObject':
                    R[v[0]] = R[v[2]] if isinstance(R[v[2]], Obj) else R[v[1]]
                elif n == 'CreateThisForNew': R[v[0]] = Unk('this')
                elif n in ('GetById', 'GetByIdShort', 'GetByIdLong', 'TryGetById', 'TryGetByIdLong'):
                    R[v[0]] = Unk('get:' + S[v[3]])
                elif n == 'LoadParam': R[v[0]] = Unk('param%d' % v[1])
                elif n in ('CreateClosure', 'CreateClosureLongIndex'): R[v[0]] = Unk('closure%d' % v[2])
                elif v and n not in ('Ret', 'Throw') and not n.startswith('J'):
                    R[v[0]] = Unk(n)                   # any other op that writes v[0]: value unknown
            except Exception:
                R[v[0] if v else 0] = Unk('err')
        return dict(env=env, puts=puts, rets=rets, err=err, calls=calls)

    def exports(s, fi):
        """(export names, the data object) of a module function"""
        r = s.run(fi)
        names = [a[2] for c, a in r['calls'] if 'defineProperty' in c and len(a) > 2 and isinstance(a[2], str)]
        names = [n for n in names if n != '__esModule']
        vals = [v for v in r['env'].values() if isinstance(v, (Obj, Arr))]
        return names, (max(vals, key=_weight) if vals else None)

    def find_module(s, export, check=None):
        """the module that exports `export` (its data object), or None. Candidates are the functions that load the
        name as a string constant; each is run and must define that export (and pass `check`, if given)."""
        ids = [i for i, x in enumerate(s.S) if x == export]
        if not ids:
            return None
        if s._starts is None:
            order = sorted(range(len(s.F)), key=lambda i: s.F[i]['offset'])
            s._starts = ([s.F[i]['offset'] for i in order], order)
        starts, order = s._starts
        opnum = {name: k for k, (name, _) in enumerate(s.ops)}
        pats = []
        for i in ids:
            if i < 0x10000:
                pats.append(re.escape(bytes([opnum['LoadConstString']])) + b'.' + re.escape(struct.pack('<H', i)))
            pats.append(re.escape(bytes([opnum['LoadConstStringLongIndex']])) + b'.' + re.escape(struct.pack('<I', i)))
        cands = set()
        for m in re.finditer(b'|'.join(pats), s.H.d, re.S):
            k = bisect.bisect_right(starts, m.start()) - 1
            if k >= 0:
                fi = order[k]; f = s.F[fi]
                if f['offset'] <= m.start() < f['offset'] + f['size']:
                    cands.add(fi)
        best = None
        for fi in sorted(cands, key=lambda i: -s.F[i]['size']):
            names, data = s.exports(fi)
            if export in names and data is not None and (check is None or check(data)):
                w = _weight(data)
                if best is None or w > best[0]:
                    best = (w, fi, data)
        return best and (best[1], best[2])


def _weight(x, depth=0):
    """rough size of a value (how much text it holds), to tell the real data from small look-alikes"""
    if isinstance(x, str): return len(x)
    if depth > 12: return 0
    if isinstance(x, dict): return sum(_weight(v, depth + 1) for v in x.values())
    if isinstance(x, list): return sum(_weight(v, depth + 1) for v in x)
    return 0
