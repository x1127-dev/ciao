import { AddressInfo } from "node:net";
import { dnsLowerCase } from "../util/dns-equal.ts";
import { DNSLabelCoder } from "./DNSLabelCoder.ts";
import { DecodedData, DNSRecord, QClass, QType } from "./DNSPacket.ts";

export class Question implements DNSRecord {

  private static readonly QU_MASK = 0x8000; // 2 bytes, first bit set
  private static readonly NOT_QU_MASK = 0x7FFF;

  readonly name: string;
  private lowerCasedName?: string;
  readonly type: QType;
  readonly class: QClass;

  unicastResponseFlag = false;

  constructor(name: string, type: QType, unicastResponseFlag = false, clazz = QClass.IN) {
    if (!name.endsWith(".")) {
      name += ".";
    }

    this.name = name;
    this.type = type;
    this.class = clazz;

    this.unicastResponseFlag = unicastResponseFlag;
  }

  public getLowerCasedName(): string {
    return this.lowerCasedName || (this.lowerCasedName = dnsLowerCase(this.name));
  }

  public getEncodingLength(coder: DNSLabelCoder): number {
    return coder.getNameLength(this.name) + 4; // 2 bytes type; 2 bytes class
  }

  public encode(coder: DNSLabelCoder, buffer: Buffer, offset: number): number {
    const oldOffset = offset;

    const nameLength = coder.encodeName(this.name, offset);
    offset += nameLength;

    buffer.writeUInt16BE(this.type, offset);
    offset += 2;

    let qClass = this.class;
    if (this.unicastResponseFlag) {
      qClass |= Question.QU_MASK;
    }
    buffer.writeUInt16BE(qClass, offset);
    offset += 2;

    return offset - oldOffset; // written bytes
  }

  public clone(): Question {
    return new Question(this.name, this.type, this.unicastResponseFlag, this.class);
  }

  public asString(): string {
    return `Q ${this.name} ${this.type} ${this.class}`;
  }

  public static decode(context: AddressInfo, coder: DNSLabelCoder, buffer: Buffer, offset: number): DecodedData<Question> {
    const oldOffset = offset;

    const decodedName = coder.decodeName(offset);
    offset += decodedName.readBytes;

    const type = buffer.readUInt16BE(offset) as QType;
    offset += 2;

    const qClass = buffer.readUInt16BE(offset);
    offset += 2;
    const clazz = (qClass & this.NOT_QU_MASK) as QClass;
    const quFlag = !!(qClass & this.QU_MASK);

    const question = new Question(decodedName.data, type, quFlag, clazz);

    return {
      data: question,
      readBytes: offset - oldOffset,
    };
  }

}
