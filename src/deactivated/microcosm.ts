import { MiniDoc, Handle, Did, Collection, Rkey } from './types';

const SLINGSHOT = 'https://slingshot.microcosm.blue';

export async function resolveMiniDoc(identifier: String): MiniDoc | null {
  const search = new URLSearchParams();
  search.set('identifier', identifier);
  const res = await fetch(`${SLINGSHOT}/xrpc/com.bad-example.identity.resolveMiniDoc?${search}`);
  if (!res.ok) {
    res.text().then(t => console.warn(`slingshot failed to resolve ${identifier} (${res.status})`, t));
    return null;
  }
  const data = await res.json();
  const did = new Did(data.did);
  const handle = new Handle(data.handle);
  const pds = new URL(data.pds);
  let doc = new MiniDoc(did, handle, pds);
  return doc;
}

export async function getRepoStatus(host: URL, repo: Did) {
  const search = new URLSearchParams();
  search.set('did', repo.val);
  const res = await fetch(`${host}xrpc/com.atproto.sync.getRepoStatus?${search}`);
  if (res.status === 404) {
    try {
      const err = await res.json();
      if (err.error === 'RepoNotFound') {
        return 'notfound'; // hacklaskjdflaksjdflkajsf
      }
    } catch (_) {}
  }
  if (!res.ok) {
    res.text().then(t => console.warn(`slingshot failed to getRepoStatus ${host} / ${repo} (${res.status})`, t));
    return null;
  }
  return await res.json();
}

export async function getRecord(repo: Did, collection: Collection, rkey: Rkey) {
  const search = new URLSearchParams();
  search.set('repo', repo.val);
  search.set('collection', collection.val);
  search.set('rkey', rkey.val);
  const res = await fetch(`${SLINGSHOT}/xrpc/com.atproto.repo.getRecord?${search}`);
  if (!res.ok) {
    res.text().then(t => console.warn(`slingshot failed to getRecord ${repo}/${collection}/${rkey} (${res.status})`, t));
    return null;
  }
  const data = await res.json();
  return data.value;
}

export async function* listRecords(
  pds: URL,
  repo: Did,
  collection: Collection,
) {
  let cursor = null;
  do {
    const search = new URLSearchParams();
    search.set('repo', repo.val);
    search.set('collection', collection.val);
    search.set('limit', '100');
    if (cursor) search.set('cursor', cursor);
    const res = await fetch(`${pds}xrpc/com.atproto.repo.listRecords?${search}`);
    if (!res.ok) {
      res.text().then(t => console.warn(`slingshot failed to listRecords ${repo} / ${collection} (${res.status})`, t));
      return null;
    }
    const data = await res.json();
    for (const { value } of data.records) {
      yield value;
    }
    cursor = data.cursor;
  } while (cursor);
}
