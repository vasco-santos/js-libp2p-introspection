'use strict'

const Big = require('bignumber.js')

const getResultCounter = () => ({
  total: 0,
  ok: 0,
  err: 0
})

const getSlidingCounter = () => ({
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

const getDataGauge = (stats, type) => {
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

module.exports = {
  getResultCounter,
  getSlidingCounter,
  getDataGauge
}
