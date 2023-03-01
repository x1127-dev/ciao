import { RType } from "../DNSPacket.ts";
import { ResourceRecord } from "../ResourceRecord.ts";
import { AAAARecord } from "./AAAARecord.ts";
import { ARecord } from "./ARecord.ts";
import { CNAMERecord } from "./CNAMERecord.ts";
import { NSECRecord } from "./NSECRecord.ts";
import { OPTRecord } from "./OPTRecord.ts";
import { PTRRecord } from "./PTRRecord.ts";
import { SRVRecord } from "./SRVRecord.ts";
import { TXTRecord } from "./TXTRecord.ts";

ResourceRecord.typeToRecordDecoder.set(RType.AAAA, AAAARecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.A, ARecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.CNAME, CNAMERecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.NSEC, NSECRecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.PTR, PTRRecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.SRV, SRVRecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.OPT, OPTRecord.decodeData);
ResourceRecord.typeToRecordDecoder.set(RType.TXT, TXTRecord.decodeData);
