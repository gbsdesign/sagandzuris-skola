#!/usr/bin/env python3
"""App Store Connect helper for .github/workflows/ios.yml (the App Store Connect API key from the repo's secrets).

  asc.py prepare   — makes the app's identifier ge.sagandzureli.app when it is missing, says whether the app's page
                     exists in App Store Connect (has_app=true|false into $GITHUB_OUTPUT), and revokes the
                     „Created via API“ development certificates a former run left behind (xcodebuild makes one for each
                     run's Mac and refuses a second for „this machine“ while the old one's private key is gone)
  asc.py cleanup   — revokes this run's „Created via API“ development certificates (the build is signed for the
                     App Store by Apple's cloud certificate, so nothing else needs them)

Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (the .p8 file). Packages: pyjwt, cryptography, requests.
"""
import os
import sys
import time

import jwt
import requests

API = 'https://api.appstoreconnect.apple.com/v1'
BUNDLE = 'ge.sagandzureli.app'


def headers():
    with open(os.environ['ASC_KEY_PATH'], encoding='utf-8') as f:
        key = f.read()
    now = int(time.time())
    token = jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
                       key, algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def call(method, path, **kw):
    r = requests.request(method, API + path, headers=headers(), timeout=60, **kw)
    if r.status_code >= 400:
        print(f'::error::App Store Connect {method} {path}: {r.status_code} {r.text[:600]}')
        r.raise_for_status()
    return r.json() if r.text else {}


def output(name, value):
    path = os.environ.get('GITHUB_OUTPUT')
    if path:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(f'{name}={value}\n')
    print(f'{name}={value}')


def revoke_ci_certificates():
    data = call('GET', '/certificates', params={'filter[certificateType]': 'DEVELOPMENT,IOS_DEVELOPMENT', 'limit': 200})['data']
    for cert in data:
        a = cert.get('attributes', {})
        names = f"{a.get('displayName') or ''} {a.get('name') or ''}"
        if 'Created via API' in names:
            call('DELETE', f"/certificates/{cert['id']}")
            print(f"revoked the development certificate {cert['id']} ({names.strip()})")


def prepare():
    found = [b for b in call('GET', '/bundleIds', params={'filter[identifier]': BUNDLE, 'limit': 200})['data']
             if b['attributes'].get('identifier') == BUNDLE]
    if not found:
        call('POST', '/bundleIds', json={'data': {'type': 'bundleIds', 'attributes': {
            'identifier': BUNDLE, 'name': 'Sagandzuri', 'platform': 'IOS'}}})
        print(f'made the identifier {BUNDLE}')
    apps = call('GET', '/apps', params={'filter[bundleId]': BUNDLE})['data']
    output('has_app', 'true' if any(a['attributes'].get('bundleId') == BUNDLE for a in apps) else 'false')
    revoke_ci_certificates()


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else ''
    if what == 'prepare':
        prepare()
    elif what == 'cleanup':
        revoke_ci_certificates()
    else:
        sys.exit(__doc__)
