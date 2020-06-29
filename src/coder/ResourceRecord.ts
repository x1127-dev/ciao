import assert from "assert";
import { DNSLabelCoder, Name, NonCompressionLabelCoder } from "./DNSLabelCoder";
import { DecodedData, DNSRecord, RClass, RType } from "./DNSPacket";

export interface RecordRepresentation {
  name: string;
  type: RType;
  class: RClass;
  ttl: number;
  flushFlag: boolean;
}

interface RecordHeaderData extends RecordRepresentation {
  rDataLength: number;
}

export type RRDecoder = (coder: DNSLabelCoder, header: RecordRepresentation, buffer: Buffer, offset: number) => DecodedData<ResourceRecord>;

export abstract class ResourceRecord implements DNSRecord { // RFC 1035 4.1.3.

  public static readonly typeToRecordDecoder: Map<RType, RRDecoder> = new Map();
  public static unsupportedRecordDecoder: RRDecoder;

  private static readonly FLUSH_MASK = 0x8000; // 2 bytes, first bit set
  private static readonly NOT_FLUSH_MASK = 0x7FFF;

  private static readonly DEFAULT_TTL = 4500; // 75 minutes

  readonly name: string;
  readonly type: RType;
  readonly class: RClass;
  ttl: number;

  flushFlag = false;

  private trackedName?: Name;

  protected constructor(headerData: RecordRepresentation);
  protected constructor(name: string, type: RType, ttl?: number, flushFlag?: boolean, clazz?: RClass);
  protected constructor(name: string | RecordRepresentation, type?: RType, ttl: number = ResourceRecord.DEFAULT_TTL, flushFlag = false, clazz: RClass = RClass.IN) {
    if (typeof name === "string") {
      if (!name.endsWith(".")) {
        name = name + ".";
      }

      this.name = name;
      this.type = type!;
      this.class = clazz;
      this.ttl = ttl;
      this.flushFlag = flushFlag;
    } else {
      this.name = name.name;
      this.type = name.type;
      this.class = name.class;
      this.ttl = name.ttl;
      this.flushFlag = name.flushFlag;
    }
  }

  public getEstimatedEncodingLength(): number {
    // returns encoding length without considering space saving achieved by message compression
    return DNSLabelCoder.getUncompressedNameLength(this.name) + 10 + this.getEstimatedRDataEncodingLength();
  }

  public trackNames(coder: DNSLabelCoder): void {
    assert(!this.trackedName, "trackNames can only be called once per DNSLabelCoder!");
    this.trackedName = coder.trackName(this.name);
  }

  public finishEncoding(): void {
    this.trackedName = undefined;
  }

  public getEncodingLength(coder: DNSLabelCoder): number {
    if (!this.trackedName) {
      assert.fail("Illegal state. Name wasn't yet tracked!");
    }

    return coder.getNameLength(this.trackedName)
      + 10 // 2 bytes TYPE; 2 bytes class, 4 bytes TTL, 2 bytes RDLength
      + this.getRDataEncodingLength(coder);
  }

  public encode(coder: DNSLabelCoder, buffer: Buffer, offset: number): number {
    if (!this.trackedName) {
      assert.fail("Illegal state. Name wasn't yet tracked!");
    }

    const oldOffset = offset;

    const nameLength = coder.encodeName(this.trackedName, offset);
    offset += nameLength;

    buffer.writeUInt16BE(this.type, offset);
    offset += 2;

    let rClass = this.class;
    if (this.flushFlag) {
      rClass |= ResourceRecord.FLUSH_MASK;
    }
    buffer.writeUInt16BE(rClass, offset);
    offset += 2;

    buffer.writeUInt32BE(this.ttl, offset);
    offset += 4;

    const dataLength = this.encodeRData(coder, buffer, offset + 2);

    buffer.writeUInt16BE(dataLength, offset);
    offset += 2 + dataLength;

    return offset - oldOffset; // written bytes
  }

  public getRawData(): Buffer { // returns the rData as a buffer without any message compression (used for probe tiebreaking)
    const length = this.getEstimatedRDataEncodingLength();
    const buffer = Buffer.allocUnsafe(length);

    const coder = NonCompressionLabelCoder.INSTANCE;
    coder.initBuf(buffer);

    const writtenBytes = this.encodeRData(coder, buffer, 0, true);
    assert(writtenBytes === buffer.length, "Didn't completely write to the buffer! (" + writtenBytes + "!=" + buffer.length  +")");
    coder.resetCoder();

    return buffer;
  }

  protected abstract getEstimatedRDataEncodingLength(): number;

  protected abstract getRDataEncodingLength(coder: DNSLabelCoder): number;

  protected abstract encodeRData(coder: DNSLabelCoder, buffer: Buffer, offset: number, disabledCompression?: boolean): number;

  public abstract clone(): ResourceRecord;

  /**
   * Evaluates if the data section of the record is equal to the supplied record
   * @param record
   */
  public abstract dataEquals(record: ResourceRecord): boolean;

  public static clone<T extends ResourceRecord>(records: T[]): T[] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return records.map(record => record.clone());
  }

  protected getRecordRepresentation(): RecordRepresentation {
    return {
      name: this.name,
      type: this.type,
      class: this.class,
      ttl: this.ttl,
      flushFlag: this.flushFlag,
    };
  }

  /**
   * Returns if the this and the supplied record are the same (ignoring ttl and flush flag)
   * @param record
   */
  public aboutEqual(record: ResourceRecord): boolean {
    return this.type === record.type && this.name === record.name && this.class === record.class
      && this.dataEquals(record);
  }

  public representsSameData(record: ResourceRecord): boolean {
    return this.type === record.type && this.name === record.name && this.class === record.class;
  }

  public static decode(coder: DNSLabelCoder, buffer: Buffer, offset: number): DecodedData<ResourceRecord> {
    const oldOffset = offset;

    const decodedHeader = this.decodeRecordHeader(coder, buffer, offset);
    offset += decodedHeader.readBytes;

    const header = decodedHeader.data;
    const rrDecoder = this.typeToRecordDecoder.get(header.type) || this.unsupportedRecordDecoder;

    // we slice the buffer (below), so out of bounds error are instantly detected
    const decodedRecord = rrDecoder(coder, header, buffer.slice(0, offset + header.rDataLength), offset);
    offset += decodedRecord.readBytes;

    return {
      data: decodedRecord.data,
      readBytes: offset - oldOffset,
    };
  }

  protected static decodeRecordHeader(coder: DNSLabelCoder, buffer: Buffer, offset: number): DecodedData<RecordHeaderData> {
    const oldOffset = offset;

    const decodedName = coder.decodeName(offset);
    offset += decodedName.readBytes;

    const type = buffer.readUInt16BE(offset) as RType;
    offset += 2;

    const rClass = buffer.readUInt16BE(offset);
    offset += 2;
    const clazz = (rClass & this.NOT_FLUSH_MASK) as RClass;
    const flushFlag = !!(rClass & this.FLUSH_MASK);

    const ttl = buffer.readUInt32BE(offset);
    offset += 4;

    const rDataLength = buffer.readUInt16BE(offset);
    offset += 2;

    const rHeader: RecordHeaderData = {
      name: decodedName.data,
      type: type,
      class: clazz,
      ttl: ttl,
      flushFlag: flushFlag,
      rDataLength: rDataLength,
    };

    return {
      data: rHeader,
      readBytes: offset - oldOffset,
    };
  }

}