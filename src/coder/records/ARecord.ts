import assert from "node:assert";
import net from "node:net";
import { DNSLabelCoder } from "../DNSLabelCoder.ts";
import { DecodedData, RType } from "../DNSPacket.ts";
import { RecordRepresentation, ResourceRecord } from "../ResourceRecord.ts";

export class ARecord extends ResourceRecord {

  public static readonly DEFAULT_TTL = 120;

  readonly ipAddress: string;

  constructor(name: string, ipAddress: string, flushFlag?: boolean, ttl?: number);
  constructor(header: RecordRepresentation, ipAddress: string);
  constructor(name: string | RecordRepresentation, ipAddress: string, flushFlag?: boolean, ttl?: number) {
    if (typeof name === "string") {
      super(name, RType.A, ttl || ARecord.RR_DEFAULT_TTL_SHORT, flushFlag);
    } else {
      assert(name.type === RType.A);
      super(name);
    }

    assert(net.isIPv4(ipAddress), "IP address is not in v4 format!");
    this.ipAddress = ipAddress;
  }

  protected getRDataEncodingLength(): number {
    return 4; // 4 byte ipv4 address
  }

  protected encodeRData(coder: DNSLabelCoder, buffer: Buffer, offset: number): number {
    const oldOffset = offset;

    const bytes = this.ipAddress.split(".");
    assert(bytes.length === 4, "invalid ip address");

    for (const byte of bytes) {
      const number = parseInt(byte, 10);
      buffer.writeUInt8(number, offset++);
    }

    return offset - oldOffset; // written bytes
  }

  public static decodeData(coder: DNSLabelCoder, header: RecordRepresentation, buffer: Buffer, offset: number): DecodedData<ARecord> {
    const oldOffset = offset;

    const ipBytes: string[] = new Array(4);

    for (let i = 0; i < 4; i++) {
      const byte = buffer.readUInt8(offset++);
      ipBytes[i] = byte.toString(10);
    }

    const ipAddress = ipBytes.join(".");

    return {
      data: new ARecord(header, ipAddress),
      readBytes: offset - oldOffset,
    };
  }

  public clone(): ARecord {
    return new ARecord(this.getRecordRepresentation(), this.ipAddress);
  }

  public dataAsString(): string {
    return this.ipAddress;
  }

  public dataEquals(record: ARecord): boolean {
    return this.ipAddress === record.ipAddress;
  }

}
