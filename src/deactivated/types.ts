class Stringy {
  val: String;
  constructor(val: String) {
    this.val = val;
  }
}

export class Did extends Stringy {}
export class Handle extends Stringy {}
export class Collection extends Stringy {}
export class Rkey extends Stringy {}

export class MiniDoc {
  did: Did;
  handle: Handle;
  pds: URL;

  constructor(did: Did, handle: Handle, pds: URL) {
    this.did = did;
    this.handle = handle;
    this.pds = pds;
  }
};
