'use strict'

const { getResultCounter, getSlidingCounter, getDataGauge } = require('./commons')

// Swarm
const getSwarm = (node) => {
  // TODO
  const _swarmCounterGroup = (g) => ({
    incoming_opened: getSlidingCounter(),
    outgoing_opened: getSlidingCounter(),
    closed: getSlidingCounter(),
    active: g && g.length
  })

  // TODO
  const _taggedSwarmCounterGroup = (conns) => {
    // const connPeerIds = Object.keys(conns)
    // console.log('_taggedSwarmCounterGroup', conns)
    // console.log('_taggedSwarmCounterGroup_1', conns[connPeerIds[0]])
    // console.log('_taggedSwarmCounterGroup', conns[connPeerIds[0]][0].muxer)

    // const protocols = Object.keys(node._switch.protocols)

    return {
      incoming_opened: null,
      outgoing_opened: null,
      closed: null,
      active: null
    }
  }

  // this.conns when connection established
  const conns = node._switch.connection.connections

  return {
    conn_stats: _swarmCounterGroup(Object.keys(conns)),
    stream_stats: _swarmCounterGroup(), // TODO
    stream_by_proto_stats: _taggedSwarmCounterGroup(conns), // TODO
    conns: _connections(conns),
    streams: [], // TODO
    dialer: _dialer() // TODO
  }
}

// TODO finish
const _connections = (conns) => {
  return Object.keys(conns).map((key) => {
    const conn = conns[key][0]
    const peer_id = conn.theirB58Id
    const stats = node.stats.forPeer(peer_id)

    return {
      id: conn.id,
      peer_id,
      status: introspectionProto.Status.ACTIVE, // TODO change accordingly
      transport: 'TCP', // TODO change accordingly
      endpoints: {
        src_multiaddr: conn.theirPeerInfo.multiaddrs.toArray().map((ma) => ma.toString())[0], // TODO is this the src?
        dst_multiaddr: ''
      },
      timeline: {

      },
      role: introspectionProto.Role.INITIATOR, // TODO change accordingly
      traffic: {
        traffic_in: getDataGauge(stats, 'in'),
        traffic_out: getDataGauge(stats, 'out')
      },
      attribs: {
        multiplexer: conn.muxer.multicodec,
        encryption: 'secio' // TODO change accordingly
      },
      latency_ns: '',
      streams: _connectionStreams(conn)
    }
  })
}

const _connectionStreams = (conn) => {
  // TODO SPDY // differences
  const muxersList = conn.muxer.multiplex._list.filter((m) => !!m)

  return muxersList.map((channel) => ({
    id: Buffer.from(channel.name),
    protocol: undefined,
    role: channel.initiator ? introspectionProto.Role.INITIATOR : introspectionProto.Role.RESPONDER,
    trafic: undefined,
    conn: undefined,
    timeline: {},
    latency_ns: '',
    user_provided_tags: []
  }))
}

// TODO finish
const _streams = () => (
  []
)

const _dialer = () => {
  // TODO finish
  const _inflightDial = () => (
    []
  )

  return {
    throttle_max: 0,
    throttle_curr: 0,
    peer_dials: getResultCounter(),
    addrs_dials: getResultCounter(),
    dials_per_transport: {},
    inflight: _inflightDial()
  }
}

module.exports = {
  getSwarm: (node) => getSwarm(node)
}
