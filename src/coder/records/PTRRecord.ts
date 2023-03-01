import assert from "node:assert";
import { dnsLowerCase } from "../../util/dns-equal.ts";
import { DNSLabelCoder } from "../DNSLabelCoder.ts";
import { DecodedData, RType } from "../DNSPacket.ts";
import { RecordRepresentation, ResourceRecord } from "../ResourceRecord.ts";

export class PTRRecord extends ResourceRecord {

  public static readonly DEFAULT_TTL = ResourceRecord.RR_DEFAULT_TTL;

  readonly ptrName: string;
  private lowerCasedPtrName?: string;

  constructor(name: string, ptrName: string, flushFlag?: boolean, ttl?: number);
  constructor(header: RecordRepresentation, ptrName: string);
  constructor(name: string | RecordRepresentation, ptrName: string, flushFlag?: boolean, ttl?: number) {
    if (typeof name === "string") {
      super(name, RType.PTR, ttl, flushFlag);
    } else {
      assert(name.type === RType.PTR);
      super(name);
    }

    if (!ptrName.endsWith(".")) {
      ptrName += ".";
    }

    this.ptrName = ptrName;
  }

  public getLowerCasedPTRName(): string {
    return this.lowerCasedPtrName || (this.lowerCasedPtrName = dnsLowerCase(this.ptrName));
  }

  protected getRDataEncodingLength(coder: DNSLabelCoder): number {
    return coder.getNameLength(this.ptrName);
  }

  protected encodeRData(coder: DNSLabelCoder, buffer: Buffer, offset: number): number {
    const oldOffset = offset;

    const ptrNameLength = coder.encodeName(this.ptrName, offset);
    offset += ptrNameLength;

    return offset - oldOffset; // written bytes
  }

  public static decodeData(coder: DNSLabelCoder, header: RecordRepresentation, buffer: Buffer, offset: number): DecodedData<PTRRecord> {
    const oldOffset = offset;

    const decodedName = coder.decodeName(offset);
    offset += decodedName.readBytes;

    return {
      data: new PTRRecord(header, decodedName.data),
      readBytes: offset - oldOffset,
    };
  }

  public clone(): PTRRecord {
    return new PTRRecord(this.getRecordRepresentation(), this.ptrName);
  }

  public dataAsString(): string {
    return this.ptrName;
  }

  public dataEquals(record: PTRRecord): boolean {
    return this.getLowerCasedPTRName() === record.getLowerCasedPTRName();
  }

}
