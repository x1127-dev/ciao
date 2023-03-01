// import "source-map-support/register"; // registering node-source-map-support for typescript stack traces
import { createDebug } from "./deps.ts";
import { version } from "./constants.ts";

if (version.includes("beta") || Deno.env.get('BCT')) { // enable debug output if beta version or running bonjour conformance testing
  const debug = Deno.env.get('DEBUG');
  if (!debug || !debug.includes("ciao")) {
    if (!debug) {
      createDebug.enable("ciao:*");
    } else {
      createDebug.enable(debug + ",ciao:*");
    }
  }
}

import "./coder/records/index.ts";
import { Responder, ResponderOptions } from "./Responder.ts";

export * from "./CiaoService.ts";
export * from "./Responder.ts";
export type { MDNSServerOptions } from "./MDNSServer.ts";

function printInitInfo() {
  const debug = createDebug("ciao:init");
  debug("Loading ciao v" + version + "...");
}
printInitInfo();

/**
 * Defines the transport protocol of a service.
 *
 * As of RFC 6763 7. TCP must be used for any applications using tcp.
 *  For applications using any other transport protocol UDP must be used.
 *  This applies to all other transport protocols like SCTP, DCCP, RTMFP, etc
 */
export const enum Protocol {
  TCP = "tcp",
  UDP = "udp",
}

/**
 * This method is used to get a responder for the provided (optional) set of options.
 *
 * Ciao tries to create as few Responder instances as possible.
 * Thus, it will share the same Responder instance for the same set of options.
 *
 * @param options - If specified, the options will be passed to the underlying mdns server.
 * @returns A Responder instance for the given options. Might be shared with others using the same options.
 */
export function getResponder(options?: ResponderOptions): Responder {
  return Responder.getResponder(options);
}

export default  {
  getResponder: getResponder,
};
