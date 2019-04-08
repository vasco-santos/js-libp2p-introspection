'use strict'

const os = require('os')
const Big = require('bignumber.js')

const introspectionProto = require('./pb/introspection.proto')

module.exports = (node) => {
  // Auxiliary data models

  // TODO
  const _getResultCounter = () => ({
    total: 0,
    ok: 0,
    err: 0
  })

  const _getSlidingCounter = () => ({
    over_1m: 0,
    over_5m: 0,
    over_15m: 0,
    over_30m: 0,
    over_1hr: 0,
    over_2hr: 0,
    over_4hr: 0,
    over_8hr: 0,
    over_12hr: 0,
    over_24hr: 0
  })

  const _dataGauge = (stats, type) => {
    if (type === 'in') {
      return {
        cum_bytes: stats.snapshot.dataReceived,
        cum_packets: 0, // TODO
        inst_bw: new Big(stats.movingAverages.dataReceived['60000'].movingAverage() / 60)
      }
    }

    return {
      cum_bytes: stats.snapshot.dataSent,
      cum_packets: 0, // TODO
      inst_bw: new Big(stats.movingAverages.dataSent['60000'].movingAverage() / 60)
    }
  }

  // Host
  const _host = () => ({
    peer_id: node.peerInfo.id.toB58String(),
    runtime: _runtime(),
    transports: _transports(),
    protocols: Object.keys(node._switch.protocols),
    subsystems: _subsystems()
  })

  const _runtime = () => ({
    implementation: 'js-libp2p',
    version: `${require('../package.json').version}`,
    platform: `${os.arch()}/${os.platform()}`,
  })

  const _subsystems = () => ({
    swarm: _swarm()
  })

  // Swarm
  const _swarm = () => {
    // TODO
    const _swarmCounterGroup = (g) => ({
      incoming_opened: _getSlidingCounter(),
      outgoing_opened: _getSlidingCounter(),
      closed: _getSlidingCounter(),
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
          traffic_in: _dataGauge(stats, 'in'),
          traffic_out: _dataGauge(stats, 'out')
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
      peer_dials: _getResultCounter(),
      addrs_dials: _getResultCounter(),
      dials_per_transport: {},
      inflight: _inflightDial()
    }
  }

  // Transports
  const _transports = () => {
    const multiaddrs = node.peerInfo.multiaddrs.toArray()
    const transports = node._transport

    const getTag = (t) => t.tag || t[Symbol.toStringTag]

    return transports.filter((t) => getTag(t)).map((t) => ({
      id: Buffer.from(getTag(t)), // TODO
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
