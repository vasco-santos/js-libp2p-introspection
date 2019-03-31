'use strict'

const os = require('os')
const introspectionProto = require('./pb/introspection.proto')

module.exports = (node) => {
  // Auxiliary data models
  const _peerId = {
    id_bytes: node.peerInfo.id.toBytes(),
    id_string: node.peerInfo.id.toB58String()
  }

  // TODO
  const _swarmCounterGroup = (g) => ({
    incoming_opened: null,
    outgoing_opened: null,
    closed: null,
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

  const _dataGauge = (stats, type) => {
    if (type === 'in') {
      return {
        cum_bytes: stats.snapshot.dataReceived,
        cum_packets: null, // TODO
        inst_bw: stats.movingAverages.dataReceived['60000'].movingAverage() / 60
      }
    }

    return {
      cum_bytes: stats.snapshot.dataSent,
      cum_packets: null, // TODO
      inst_bw: stats.movingAverages.dataSent['60000'].movingAverage() / 60
    }
  }

  // Host
  const _host = () => ({
    id: _peerId,
    implementation: 'js-libp2p',
    version: `${require('../../package.json').version}`,
    platform: `${os.arch()}/${os.platform()}`,
    transports: _transports(),
    protocols: Object.keys(node._switch.protocols),
    swarm: _swarm()
  })

  // Swarm
  const _swarm = () => {
    const conns = node._switch.connection.connections

    return {
      conn_stats: _swarmCounterGroup(Object.keys(conns)),
      stream_stats: _swarmCounterGroup(), // TODO
      stream_by_proto_stats: _taggedSwarmCounterGroup(conns), // TODO P0
      conns: _connections(conns),
      streams: _streams(), // TODO
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
        traffic_in: _dataGauge(stats, 'in'),
        traffic_out: _dataGauge(stats, 'out'),
        attribs: {
          multiplexer: conn.muxer.multicodec,
          encryption: 'secio' // TODO change accordingly
        },
        latency_ns: ''
      }
    })
  }

  // TODO finish
  const _streams = () => (
    []
  )

  const _dialer = () => ({
    throttle_max: '',
    throttle_curr: '',
    peer_dials: {},
    addrs_dials: {},
    dials_per_transport: {},
    inflight: _inflightDial()
  })

  // TODO finish
  const _inflightDial = () => (
    []
  )

  // Transports
  const _transports = () => {
    const multiaddrs = node.peerInfo.multiaddrs.toArray()
    const transports = node._transport

    const getTag = (t) => t.tag || t[Symbol.toStringTag]

    return transports.filter((t) => getTag(t)).map((t) => ({
      name: getTag(t),
      listening: true,
      dialing: true,
      listen_multiaddrs: t.filter(multiaddrs).map((ma) => ma.toString())
    }))
  }

  return {
    host: _host,
    swarm: _swarm,
    marshal: introspectionProto.Host.encode,
    unmarshal: introspectionProto.Host.decode
  }
}
