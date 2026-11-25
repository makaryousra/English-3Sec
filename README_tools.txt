Adding questions without touching index.html
1) Put new questions in a CSV (columns: unit,lesson,category,question,A,B,C,D,answer,explanation,arabicNote,tags,source; answer = A/B/C/D) or a JSON list.
2) Run: python3 tools/build_bank.py my_questions.csv
3) Commit the updated bank/ folder. The site loads bank/index.json and its chunks automatically when served over http(s) (e.g. GitHub Pages).
Rows with problems (missing options, bad answer, duplicates) are reported and skipped; question text is never changed.
