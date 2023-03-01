import assert from "node:assert";
import { dnsLowerCase } from "../../util/dns-equal.ts";
import { DNSLabelCoder } from "../DNSLabelCoder.ts";
import { DecodedData, RType } from "../DNSPacket.ts";
import { RecordRepresentation, ResourceRecord } from "../ResourceRecord.ts";

export class CNAMERecord extends ResourceRecord {

  public static readonly DEFAULT_TTL = ResourceRecord.RR_DEFAULT_TTL;

  readonly cname: string;
  private lowerCasedCName?: string;

  constructor(name: string, cname: string, flushFlag?: boolean, ttl?: number);
  constructor(header: RecordRepresentation, cname: string);
  constructor(name: string | RecordRepresentation, cname: string, flushFlag?: boolean, ttl?: number) {
    if (typeof name === "string") {
      super(name, RType.CNAME, ttl, flushFlag);
    } else {
      assert(name.type === RType.CNAME);
      super(name);
    }

    if (!cname.endsWith(".")) {
      cname += ".";
    }

    this.cname = cname;
  }

  public getLowerCasedCName(): string {
    return this.lowerCasedCName || (this.lowerCasedCName = dnsLowerCase(this.cname));
  }

  protected getRDataEncodingLength(coder: DNSLabelCoder): number {
    return coder.getNameLength(this.cname);
  }

  protected encodeRData(coder: DNSLabelCoder, buffer: Buffer, offset: number): number {
    const oldOffset = offset;

    const cnameLength = coder.encodeName(this.cname, offset);
    offset += cnameLength;

    return offset - oldOffset; // written bytes
  }

  public static decodeData(coder: DNSLabelCoder, header: RecordRepresentation, buffer: Buffer, offset: number): DecodedData<CNAMERecord> {
    const oldOffset = offset;

    const decodedName = coder.decodeName(offset);
    offset += decodedName.readBytes;

    return {
      data: new CNAMERecord(header, decodedName.data),
      readBytes: offset - oldOffset,
    };
  }

  public clone(): CNAMERecord {
    return new CNAMERecord(this.getRecordRepresentation(), this.cname);
  }

  public dataAsString(): string {
    return this.cname;
  }

  public dataEquals(record: CNAMERecord): boolean {
    return this.getLowerCasedCName() === record.getLowerCasedCName();
  }

}
