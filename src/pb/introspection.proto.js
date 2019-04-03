'use strict'

const protons = require('protons')

/* eslint-disable no-tabs */
const message = `
syntax = "proto3";

import "google/protobuf/timestamp.proto";

package introspection.pb;

// ResultCounter is a monotonically increasing counter that reports an ok/err breakdown of the total.
message ResultCounter {
  uint32 total = 1;
  uint32 ok = 2;
  uint32 err = 3;
}

// Moving totals over sliding time windows. Models sensible time windows,
// we don't have to populate them all at once.
//
// Graphical example:
//
// time     past -> present                              an event 16 min ago
// ======================================================X================>>
//                                                       |               | 1m
//                                                       |           |---| 5m
//                                                       | |-------------| 15m
//                                          |------------X---------------| 30m
//            |------------------------------------------X---------------| 60m
message SlidingCounter {
  uint32 over_1m      = 1;
  uint32 over_5m      = 2;
  uint32 over_15m     = 3;
  uint32 over_30m     = 4;
  uint32 over_1hr     = 5;
  uint32 over_2hr     = 6;
  uint32 over_4hr     = 7;
  uint32 over_8hr     = 8;
  uint32 over_12hr    = 9;
  uint32 over_24hr    = 10;
}

// DataGauge reports stats for data traffic in a given direction.
message DataGauge {
  // Cumulative bytes.
  uint64 cum_bytes    = 1;
  // Cumulative packets.
  uint64 cum_packets  = 2;
  // Instantaneous bandwidth measurement (bytes/second).
  uint64 inst_bw      = 3;
}

// Transport represents the state of a transport. Stats for the transport are
// hosted and reported from the relevant component.
message Transport {
  // the id of this transport for referencing purposes.
  bytes id       = 1;
  // the name of this transport.
  string name     = 2;
  // whether this transport is enabled for listening.
  bool listening  = 3;
  // whether this transport is enabled for dialing.
  bool dialing    = 4;
  // the multiaddrs this transport is listening on, if enabled for listening.
  repeated string listen_multiaddrs = 5;
}

// Dialer encapsulates stats and state about the swarm dialer.
message Dialer {
  // InflightDial represents a dial that is in progress.
  message InflightDial {
    string peer_id          = 1;
    uint32 addrs_cnt        = 2;
    ResultCounter attempts  = 3;
  }

  // the number of concurrent dials allowed.
  uint32 throttle_max     = 1;
  // the number of concurrent dials currently active.
  uint32 throttle_curr    = 2;

  // peer dial stats.
  ResultCounter peer_dials    = 3;
  // address dial stats.
  ResultCounter addrs_dials   = 4;
  // dial stats per transport.
  map<string, ResultCounter> dials_per_transport = 5;

  // listing of in-progress dials.
  repeated InflightDial inflight = 6;
}

// Swarm reports stats and state of the swarm subsystem.
message Swarm {
  // SwarmCounterGroup models a group of counters; encapsulation is important to spare 1-byte field IDs (1-15).
  message SwarmCounterGroup {
    // incoming items opened.
    SlidingCounter incoming_opened = 1;
    // outgoing items opened.
    SlidingCounter outgoing_opened = 2;
    // items closed.
    SlidingCounter closed = 3;
    // current count (instantaneous reading).
    uint32 active = 4;
  }

  // TaggedSwarmCounterGroup models a group of counters segregated by a tag.
  // See docs for SwarmCounterGroup for inner fields.
  message TaggedSwarmCounterGroup {
    map<string, SlidingCounter> incoming_opened = 1;
    map<string, SlidingCounter> outgoing_opened = 2;
    map<string, SlidingCounter> closed = 3;
    map<string, uint32> active = 4;
  }

  // connections statistics.
  SwarmCounterGroup conn_stats = 1;
  // stream statistics
  SwarmCounterGroup stream_stats = 2;
  // stream statistics per protocol.
  TaggedSwarmCounterGroup stream_by_proto_stats = 3;

  // connection listing.
  repeated Connection conns = 4;
  // streams listing.
  repeated Stream streams = 5;

  // inner subsystems
  Dialer dialer = 6;

  // We want to be frugal with the 1-15 field id range, as they are represented by 1 byte only.
  reserved 7 to 15;
}

// Runtime encapsulates runtime info about a node.
message Runtime {
  // e.g. go-libp2p, js-libp2p, rust-libp2p, etc.
  string implementation   = 1;
  // e.g. 1.2.3.
  string version          = 2;
  // e.g. Windows, Unix, macOS, Chrome, Mozilla, etc.
  string platform         = 3;
}

// Subsystems encapsulates all instrumented subsystems for a libp2p host.
// TODO: WIP right now we're only covering the Swarm subsystem.
message Subsystems {
  // the swarm subsystem.
  Swarm swarm = 1;
}

// Host is a top-level object conveying a cross-cutting view of the entire system, including all subsystems.
message Host {
  // our peer id.
  string peer_id  = 1;
  // this node's info.
  Runtime runtime = 2;
  // the transports enabled in this host.
  repeated Transport transports = 3;
  // the protocols attached to this host.
  repeated string protocols = 4;
  // subsystem introspection.
  Subsystems subsystems = 5;
}

// EndpointPair is a pair of multiaddrs.
message EndpointPair {
  // the source multiaddr.
  string src_multiaddr = 1;
  // the destination multiaddr.
  string dst_multiaddr = 2;
}

// The status of a connection or stream.
enum Status {
  ACTIVE  = 0;
  CLOSED  = 1;
  OPENING = 2;
  CLOSING = 3;
  ERROR   = 4;
}

// Our role in a connection or stream.
enum Role {
  INITIATOR = 0;
  RESPONDER = 1;
}

// Traffic encloses data transfer statistics.
message Traffic {
  // snapshot of the data in metrics.
  DataGauge traffic_in    = 1;
  // snapshot of the data out metrics.
  DataGauge traffic_out   = 2;
}

// a list of streams, by reference or inlined.
message StreamList {
  // NOTE: only one of the next 2 fields can appear, but proto3
  // doesn't support combining oneof and repeated.
  //
  // streams within this connection by reference.
  repeated bytes stream_ids   = 1;
  // streams within this connection by inlining.
  repeated Stream streams     = 2;
}

// Connection reports metrics and state of a libp2p connection.
message Connection {
  // Timeline contains the timestamps of the well-known milestones of a connection.
  message Timeline {
    // the instant when a connection was opened on the wire.
    string open_ts = 1;
    // the instant when the upgrade process (handshake, security, multiplexing) finished.
    string upgraded_ts = 2;
    // the instant when this connection was terminated.
    string close_ts = 3;
  }

  // Attributes encapsulates the attributes of this connection.
  message Attributes {
    // the multiplexer being used.
    string multiplexer  = 1;
    // the encryption method being used.
    string encryption   = 2;
  }

  // the id of this connection, not to be shown in user tooling,
  // used for (cross)referencing connections (e.g. relay).
  bytes id                = 1;
  // the peer id of the other party.
  string peer_id          = 2;
  // the status of this connection.
  Status status           = 3;
  // a reference to the transport managing this connection.
  bytes transport_id      = 4;
  // the endpoints participating in this connection.
  EndpointPair endpoints  = 5;
  // the timeline of the connection, see Connection.Timeline.
  Timeline timeline       = 6;
  // our role in this connection.
  Role role               = 7;
  // traffic statistics.
  Traffic traffic         = 8;
  // properties of this connection.
  Attributes attribs      = 9;
  // the instantaneous latency of this connection in nanoseconds.
  uint64 latency_ns       = 10;
  // streams within this connection.
  StreamList streams      = 11;

  reserved 12 to 15;

  // if this is a relayed connection, this points to the relaying connection.
  // a default value here (empty bytes) indicates this is not a relayed connection.
  oneof relayed_over {
      bytes conn_id       = 16;
      Connection conn     = 17;
  }
  // user provided tags.
  repeated string user_provided_tags  = 99;
}

// Stream reports metrics and state of a libp2p stream.
message Stream {
  message ConnectionRef {
    oneof connection {
      // the parent connection inlined.
      Connection conn = 1;
      // the parent connection by reference.
      bytes conn_id   = 2;
    }
  }

  // Timeline contains the timestamps of the well-known milestones of a stream.
  message Timeline {
    // the instant when the stream was opened.
    string open_ts = 1;
    // the instant when the stream was terminated.
    string close_ts = 2;
  }

  // the id of this stream, not to be shown in user tooling,
  // used for (cross)referencing streams.
  bytes id        = 1;
  // the protocol pinned to this stream.
  string protocol = 2;
  // our role in this stream.
  Role role       = 3;
  // traffic statistics.
  Traffic traffic = 4;
  // the connection this stream is hosted under.
  ConnectionRef conn  = 5;
  // the timeline of the stream, see Stream.Timeline.
  Timeline timeline   = 6;

  // the instantaneous latency of this stream in nanoseconds.
  // TODO: this is hard to calculate.
  uint64 latency_ns       = 16;
  // user provided tags.
  repeated string user_provided_tags  = 99;
}
`

module.exports = protons(message)
