'use strict'

const protons = require('protons')

/* eslint-disable no-tabs */
const message = `
syntax = "proto3";

import "google/protobuf/timestamp.proto";

package introspection.pb;

// PeerId represents a peer ID.
// TODO: At this point I'm unsure if we'll return the string or the bytes representation.
message PeerId {
  bytes id_bytes = 1;
  string id_string = 2;
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

// DataGauge reports stats for data traffic in a given direction.
message DataGauge {
  // Cumulative bytes.
  uint64 cum_bytes    = 1;
  // Cumulative packets.
  uint64 cum_packets  = 2;
  // Instantaneous bandwidth measurement.
  uint64 inst_bw      = 3;
}

// ResultCounter is a monotonically increasing counter that reports an ok/err breakdown of the total.
message ResultCounter {
  uint32 total = 1;
  uint32 ok = 2;
  uint32 err = 3;
}

// Moving totals over different time windows. Not all have to be filled.
message TimeWindowCounter {
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

// Transport represents the state of a transport. Stats for the transport are
// hosted and reported from the relevant component.
message Transport {
  // the name of this transport.
  string name     = 1;
  // whether this transport is enabled for listening.
  bool listening  = 2;
  // whether this transport is enabled for dialing.
  bool dialing    = 3;
  // the multiaddrs this transport is listening on, if enabled for listening.
  repeated string listen_multiaddrs = 4;
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
  PeerId peer_id          = 2;
  // the status of this connection.
  Status status           = 3;
  // the transport managing this connection.
  Transport transport     = 4;
  // the endpoints participating in this connection.
  EndpointPair endpoints  = 5;
  // the timeline of the connection, see Connection.Timeline.
  Timeline timeline       = 6;
  // our role in this connection.
  Role role               = 7;
  // snapshot of the data in metrics of this connection.
  DataGauge traffic_in    = 8;
  // snapshot of the data out metrics of this connection.
  DataGauge traffic_out   = 9;
  // properties of this connection.
  Attributes attribs      = 10;
  // the instantaneous latency of this connection in nanoseconds.
  uint64 latency_ns       = 11;

  // NOTE: only one of the next 2 fields can appear, but proto3
  // doesn't support combining oneof and repeated.
  // streams within this connection by reference.
  // repeated bytes stream_ids   = 12;
  // streams within this connection by inlining.
  // repeated Stream streams     = 13;

  reserved 14, 15;

  // if this is a relayed connection, this points to the relaying connection.
  // a default value here (empty bytes) indicates this is not a relayed connection.
  oneof relayed_over {
    bytes conn_id       = 16;
    Connection conn     = 17;
  }
  // user provided tags.
  repeated string user_provided_tags  = 99;
}

// Swarm reports stats and state of the swarm subsystem.
message Swarm {
  // SwarmCounterGroup models a group of counters; encapsulation is important to spare 1-byte field IDs (1-15).
  message SwarmCounterGroup {
    // incoming items opened.
    TimeWindowCounter incoming_opened = 1;
    // outgoing items opened.
    TimeWindowCounter outgoing_opened = 2;
    // items closed.
    TimeWindowCounter closed = 3;
    // current count (instantaneous reading).
    uint32 active = 4;
  }

  // TaggedSwarmCounterGroup models a group of counters segregated by a tag.
  // See docs for SwarmCounterGroup for inner fields.
  message TaggedSwarmCounterGroup {
    map<string, TimeWindowCounter> incoming_opened = 1;
    map<string, TimeWindowCounter> outgoing_opened = 2;
    map<string, TimeWindowCounter> closed = 3;
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
  // repeated Stream streams = 5;

  // inner subsystems
  Dialer dialer = 6;

  // We want to be frugal with the 1-15 field id range, as they are represented by 1 byte only.
  // reserved 7 to 15;
}

// Dialer encapsulates stats and state about the swarm dialer.
message Dialer {
    // InflightDial represents a dial that is in progress.
    message InflightDial {
      PeerId peer_id              = 1;
      uint32 addrs_cnt            = 2;
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

// Host is a top-level object conveying a cross-cutting view of the entire system, including all subsystems.
// TODO: WIP right now we're only covering the Swarm subsystem.
message Host {
  // our peer id.
  PeerId id = 1;
  // the transports enabled in this host.
  repeated Transport transports = 2;
  // the protocols attached to this host.
  repeated string protocols = 3;
  // the swarm subsystem.
  Swarm swarm = 4;
  // implementation of this host.
  string implementation = 5;
  // version of this host.
  string version = 6;
  // platform of this host.
  string platform = 7;
}
`

module.exports = protons(message)
