#!/usr/bin/env python3
"""Build bank/ chunks from new questions. Usage:
  python3 tools/build_bank.py new_questions.csv   (or .json)
CSV columns: unit,lesson,category,question,A,B,C,D,answer,explanation,arabicNote,tags,source
  answer = A/B/C/D (or 1-4). tags = words separated by | . id is optional (auto, starting at 100000).
JSON: a list of objects with the same fields as the site (options[], answer = 0-3).
Existing bank/uNN.json (flat layout: bank_uNN.json) files are kept; new questions are appended (exact duplicates are skipped and reported).
Content is never edited: rows with problems are reported and left out."""
import csv,json,sys,os,glob,re
HERE=os.path.dirname(os.path.abspath(__file__))
FLAT=os.path.exists(os.path.join(HERE,'index.html'))  # flat layout: everything in one folder
ROOT=HERE if FLAT else os.path.join(HERE,'..','bank');os.makedirs(ROOT,exist_ok=True)
PFX='bank_' if FLAT else ''
IDX=PFX+'index.json'
CH=1500
def load_existing():
    rows=[]
    for f in sorted(glob.glob(os.path.join(ROOT,PFX+'u*.json'))): rows+=json.load(open(f,encoding='utf-8'))
    return rows
def norm(t): return re.sub(r'\W+',' ',t.lower()).strip()
def read(path):
    if path.endswith('.json'): return json.load(open(path,encoding='utf-8'))
    out=[]
    with open(path,encoding='utf-8-sig',newline='') as fh:
        for r in csv.DictReader(fh):
            a=(r.get('answer') or '').strip().upper()
            ans='ABCD'.index(a) if a in list('ABCD') else int(a)-1
            out.append({'id':int(r['id']) if r.get('id') else None,'unit':int(r['unit']),'lesson':int(r.get('lesson') or 1),'category':r.get('category','').strip(),
              'question':r['question'].strip(),'options':[r[k].strip() for k in 'ABCD' if r.get(k,'').strip()],'answer':ans,'explanation':(r.get('explanation') or '').strip(),
              'arabicNote':(r.get('arabicNote') or '').strip(),'tags':[t for t in (r.get('tags') or '').split('|') if t],'source':(r.get('source') or '').strip()})
    return out
def main(p):
    ex=load_existing();ids={q['id'] for q in ex};seen={norm(q['question'])+'|'+str(q['unit']) for q in ex}
    nxt=max([100000]+[i+1 for i in ids if i>=100000]);add=0;bad=[]
    for n,q in enumerate(read(p),1):
        try:
            assert q['question'] and 2<=len(q['options'])<=6,'question/options'
            assert 0<=q['answer']<len(q['options']),'answer index'
            assert 1<=q['unit']<=12,'unit'
        except Exception as e: bad.append((n,str(e)));continue
        k=norm(q['question'])+'|'+str(q['unit'])
        if k in seen: bad.append((n,'duplicate'));continue
        if q.get('id') is None or q['id'] in ids: q['id']=nxt;nxt+=1
        ids.add(q['id']);seen.add(k);ex.append(q);add+=1
    by={}
    for q in ex: by.setdefault(q['unit'],[]).append(q)
    for f in glob.glob(os.path.join(ROOT,PFX+'u*.json')): os.remove(f)
    chunks=[]
    for u in sorted(by):
        rows=by[u]
        for i in range(0,len(rows),CH):
            part=rows[i:i+CH];name='u%02d%s.json'%(u,'' if len(rows)<=CH else '-%d'%(i//CH+1))
            json.dump(part,open(os.path.join(ROOT,PFX+name),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
            chunks.append({'file':name,'unit':u,'count':len(part)})
    json.dump({'version':1,'total':len(ex),'chunks':chunks},open(os.path.join(ROOT,IDX),'w'),indent=1)
    print('added',add,'total',len(ex),'chunks',len(chunks));[print(' skipped row',n,why) for n,why in bad]
if __name__=='__main__': main(sys.argv[1])
