const fs = require('fs')
const path = require('path')

let dbpath = path.join(__dirname, 'db.json')

module.exports = function() {
  return {
    set: function(i, v) {
      let current = JSON.parse(fs.readFileSync(dbpath))

      current[i] = v

      fs.writeFileSync(dbpath, JSON.stringify(current, null, 2))
    },
    get: function(i) {
      let current = JSON.parse(fs.readFileSync(dbpath))

      return current[i] || undefined
    },
    list: function() {
      let current = JSON.parse(fs.readFileSync(dbpath))

      return current
    },
    del: function(i) {
      let current = JSON.parse(fs.readFileSync(dbpath))
      let remp = { i: "d" }

      delete current[i] || remp.i

      fs.writeFileSync(dbpath, JSON.stringify(current, null, 2))
    }
  }
}