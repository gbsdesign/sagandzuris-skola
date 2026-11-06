# „ეკლესია-მონასტრები“ — the list (`src/data/churches.json`)

Generated — never edit `src/data/churches.json` by hand. To make it again (in a session with internet):

1. The list (3 407 churches, „ეკლესიის ტერიტორიულობა“, Indigo, https://toc.ge/map/ka) — the page's own download button
   asks for a file and then fetches it:

   ```
   curl -s -X POST -H 'X-Requested-With: XMLHttpRequest' --data '' https://toc.ge/get/xlsx/map/building/ka
   # → {"fileName":"/xlsx/map-buildings-ka.xlsx"}
   curl -s https://toc.ge/xlsx/map-buildings-ka.xlsx -o /tmp/buildings-ka.xlsx
   ```

2. Photos, Wikipedia links, descriptions — two Wikidata queries (https://query.wikidata.org/sparql, `Accept:
   application/sparql-results+json`, a plain User-Agent — never an e-mail):

   ```
   SELECT ?item ?lab ?coord ?img ?kawiki ?desc WHERE {
     ?item wdt:P17 wd:Q230; wdt:P625 ?coord.
     ?item wdt:P31/wdt:P279* ?k. VALUES ?k { wd:Q16970 wd:Q44613 wd:Q2977 wd:Q1129743 wd:Q56242215 }
     OPTIONAL { ?item wdt:P18 ?img }
     OPTIONAL { ?item rdfs:label ?lab FILTER(lang(?lab)='ka') }
     OPTIONAL { ?item schema:description ?desc FILTER(lang(?desc)='ka') }
     OPTIONAL { ?kawiki schema:about ?item; schema:isPartOf <https://ka.wikipedia.org/> }
   }
   ```

   ```
   SELECT ?item ?lab ?coord ?img ?kawiki ?desc WHERE {
     ?item wdt:P17 wd:Q230; wdt:P625 ?coord; rdfs:label ?lab.
     FILTER(lang(?lab)='ka' && REGEX(?lab, "ეკლესი|მონასტ|ტაძ|სავანე|ბაზილიკ|სამრეკლო|ღვთისმშობ|გიორგი|მთავარანგელოზ"))
     OPTIONAL { ?item wdt:P18 ?img }
     OPTIONAL { ?item schema:description ?desc FILTER(lang(?desc)='ka') }
     OPTIONAL { ?kawiki schema:about ?item; schema:isPartOf <https://ka.wikipedia.org/> }
   }
   ```

   e.g. `curl -s -G https://query.wikidata.org/sparql --data-urlencode query@q.rq -H 'Accept: application/sparql-results+json' -A 'SagandzuriSchoolBuild/1.0' -o /tmp/wd1.json`

3. `python3 scripts/churches/build.py /tmp/buildings-ka.xlsx /tmp/wd1.json /tmp/wd2.json`

The church ids are made from the name, municipality, village and place, so the admins' hours and contacts
(`churchInfo/{id}`, `churchContacts/{id}`) stay with their church as long as the source does not rename it.
