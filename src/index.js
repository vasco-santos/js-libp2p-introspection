'use strict'

const os = require('os')

const introspectionProto = require('./pb/introspection.proto')

const { getSwarm } = require('./swarm')

module.exports = (node) => {
  // Host
  const getHost = () => ({
    peer_id: node.peerInfo.id.toB58String(),
    runtime: {
      implementation: 'js-libp2p',
      version: `${require('../package.json').version}`,
      platform: `${os.arch()}/${os.platform()}`,
    },
    transports: getTransports(),
    protocols: Object.keys(node._switch.protocols),
    subsystems: {
      swarm: getSwarm(node)
    }
  })

  // Transports
  const getTransports = () => {
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
    host: getHost,
    swarm: getSwarm(node),
    marshal: introspectionProto.Host.encode,
    unmarshal: introspectionProto.Host.decode
  }
}
