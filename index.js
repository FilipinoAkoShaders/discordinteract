const MessenBot = require('messenbot.js')
const { Client, MessageAttachment, ActivityType, IntentsBitField, Partials, GatewayIntentBits, EmbedBuilder } = require('discord.js')

const fetch = require('node-fetch')
const fs = require('fs')
const util = require('util')

const spawn = require('child_process').spawn

const db = require('./dbmanager.js')()

process.on('uncaughtexception', (err) => {
  console.error(err.stack)
})

let mesclient = new MessenBot.Bot({
  accessToken: process.env.MESTOKEN,
  verifyToken: process.env.MESVER,
  pageId: process.env.MESID
})

let disclient = new Client({
  intents: [
    Object.values(GatewayIntentBits),
    Object.values(IntentsBitField.Flags)
  ],
  partials: Object.values(Partials)
})

disclient.login(process.env.DISTOKEN)
mesclient.login()

disclient.on('ready', async() => {
  console.log('Discord bot is up!')
  await mesclient.sendMessageTo('Discord Is Up!', process.env.MYID)
  disclient.user.setPresence({
    activities: [
      {
        name: process.env.ACNAME,
        type: ActivityType[process.env.ACTYPE]
      }
    ],
    status: process.env.ACSTAT
  })
})

disclient.on('error', async(err) => {
  await mesclient.sendMessageTo(err.stack, process.env.MYID)
})

mesclient.on('error', async(err) => {
  await mesclient.sendMessageTo(err, process.env.MYID)
})

let dataformat = "$:NAME@$:ID"
let format1 = "Server: $:SERVER\n\nChannel: $:CHANNEL\n\nUser: $:TAG\n\nReplied: $:REPLIED\n\n$:MESSAGE"
let format2 = "$:MESSAGE"

mesclient.on('verified', async() => {
  console.log('MessengerBot is verified')
})

mesclient.on('ready', async() => {
  await mesclient.sendMessageTo('MessagerBot Restarted', process.env.MYID)
  console.log('MessengerBot server is up')
})

// New messenger message
mesclient.on('message', async(event) => {
  if(event.sender.id === mesclient.id) return;
  
  if(!db.get('info')) db.set('info', {})
  
  if(event.message.text && event.message.text.startsWith('ts!')) {
    let splitted = event.message.text.replace('ts!', '').split(' ')
    let cmd = splitted[0]
    let args = splitted.splice(1)

    if(cmd === 'current')  {
      let data = db.get('info')

      let type = data.type
      let format = '-- Current Details --\nType: $:TYPE\nID: $:ID\nServer: $:SRV'

      if(type === 'dm') {
        let usr = await disclient.users.fetch(data.id)

        if(!usr) usr = {}

        let id = usr.id ? usr.id : data.id
        let name = usr.tag ? usr.tag : 'INVALID USER'

        let formatted = format
        .replace('$:TYPE', data.type)
        .replace('$:ID', '<'+id+'>@'+name)
        .replace('$:SRV', '@DMS')

        return await event.sendMessage(formatted)
      } else if(type === 'channel') {
        let server = await disclient.guilds.fetch(data.server)

        if(!data.server) {
          return await event.sendMessage('SERVER NOT CONNECTED')
        } else if(!server) {
          return await event.sendMessage('CANNOT FIND SERVER')
        }
        
        let channel = await server.channels.fetch(data.id)

        if(!channel) channel = {}

        let id = channel.id ? channel.id : data.id
        let name = channel.name ? channel.name : 'INVALID CHANNEL'

        let formatted = format
        .replace('$:TYPE', data.type)
        .replace('$:ID', '<'+id+'>@'+name)
        .replace('$:SRV', '<'+server.id+'>@'+server.name)

        return await event.sendMessage(formatted)
      }
    } else if(cmd === 'muteusr') {
      let data = db.get('info')
      
      let id = args.join(' ')

      let user = await disclient.users.fetch(id)
      
      if(!user) return await event.sendMessage('LOL! Your dont even know him XD')

      if(!data.mutes) data.mutes = {}

      if(data.mutes[user.id]) return await event.sendMessage('You already muted it 😉')

      data.mutes[user.id] = 'mute'

      db.set('info', data)

      return await event.sendMessage('Muted <'+user.id+'>@'+user.tag)
    } else if(cmd === 'unmuteusr') {
      let data = db.get('info')
      
      let id = args.join(' ')

      let user = await disclient.users.fetch(id)
      
      if(!user) return await event.sendMessage('LOL! Your dont even know him XD')

      if(!data.mutes) data.mutes = {}

      if(!data.mutes[user.id]) return await event.sendMessage('You dont even muted it 😉')

      delete data.mutes[user.id]
        
      db.set('info', data)

      return await event.sendMessage('Unmuted <'+user.id+'>@'+user.tag)
    } else if(cmd === 'mutesrv') {
      let data = db.get('info')
      
      let id = args.join(' ')

      let server = await disclient.guilds.fetch(id)
      
      if(!server) return await event.sendMessage('LOL! Your not even there XD')

      if(!data.mutes) data.mutes = {}

      if(data.mutes[server.id]) return await event.sendMessage('You already muted them 😉')

      data.mutes[server.id] = 'mute'

      db.set('info', data)

      return await event.sendMessage('Muted <'+server.id+'>@'+server.name)
    } else if(cmd === 'unmutesrv') {
      let data = db.get('info')
      
      let id = args.join(' ')

      let server = await disclient.guilds.fetch(id)
      
      if(!server) return await event.sendMessage('LOL! Your not even there XD')

      if(!data.mutes) data.mutes = {}

      if(!data.mutes[server.id]) {
        return await event.sendMessage('That guild is not muted!')
      } else {
        delete data.mutes[server.id]
        
        db.set('info', data)

        return await event.sendMessage('Unmuted <'+server.id+'>@'+server.name)
      }
    } else if(cmd === 'leave') {
      let data = db.get('info')
      
      let id = args.join(' ')

      let server = await disclient.guilds.fetch(id)
      
      if(!server) return await event.sendMessage('LOL! Your not even there XD')

      server.leave()
    } else if(cmd === 'ping') {
      await event.sendMessage('🏓 API Latency '+disclient.ws.ping+'ms')
    } else if(cmd === 'conuser') {
      if(!args.join(' ')) return await event.sendMessage('PARAMS NOT COMPLETE')

      let data = db.get('info')

      if(data.server) delete data.server
      
      data.type = "dm"
      data.id = args.join(" ")

      db.set('info', data)
    } else if(cmd === 'conchannel') {
      if(!args.join(' ')) return await event.sendMessage('PARAMS NOT COMPLETE')

      let data = db.get('info')

      if(!data.server) return await event.sendMessage('PLEASE SET SERVER FIRST')

      data.type = "channel"
      data.id = args.join(" ")
      
      db.set('info', data)
    } else if(cmd === "serverlist") {
      let fetched = await disclient.guilds.fetch()

      await event.sendMessage('-- Server List --')

      fetched.map(async(v, i) => {
        let name = v.name
        let id = v.id

        let server = await disclient.guilds.fetch(id)

        await event.sendMessage('-> '+name+'@'+id+' --> '+(await getInvite(server)))
      })
    } else if(cmd === "channellist") {
      let data = db.get('info')

      if(!data.server) return await event.sendMessage('CANNOT VALIDATE')
      
      let server = await disclient.guilds.fetch(data.server)

      if(!server) return await event.sendMessage('INVALID SERVER')

      let fetched = await server.channels.fetch()

      await event.sendMessage('-- Channel List ('+server.name+') --')

      fetched.map(async(v, i) => {
        let name = v.name
        let id = v.id

        await event.sendMessage('-> '+name+'@'+id+' --> '+(await getInvite(server, id)))
      })
    } else if(cmd === "setserver") {
      if(!args.join(' ')) return await event.sendMessage('PARAMS NOT COMPLETE')

      let data = db.get('info')

      data.server = args.join(' ')

      db.set('info', data)
    } else if(cmd === 'srv') {
      let type = args[0].toLowerCase()
      let str = args.splice(1).join(' ')

      if(!type || !str) return await event.sendMessage('Not complete')

      if(type === 'includes') {
        let fetched = disclient.guilds.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.includes(str))

        if(!filter.join('')) return await event.sendMessage('Did not find guild!')

        await event.sendMessage('-- Searching Guild --')

        filter.forEach(async(u) => {
          let user = await disclient.guilds.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'starts') {
        let fetched = disclient.guilds.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.startsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find guild!')

        await event.sendMessage('-- Searching Guild --')

        filter.forEach(async(u) => {
          let user = await disclient.guilds.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'ends') {
          let fetched = disclient.guilds.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.endsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find guild!')

        await event.sendMessage('-- Searching Guild --')

        filter.forEach(async(u) => {
          let user = await disclient.guilds.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'equal') {
        let fetched = disclient.guilds.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name === (str))

        if(!filter.join('')) return await event.sendMessage('Did not find guild!')

        await event.sendMessage('-- Searching Guild --')

        filter.forEach(async(u) => {
          let user = await disclient.guilds.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'id') {
        let fetched = disclient.guilds.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.id === (str))

        if(!filter.join('')) return await event.sendMessage('Did not find guild!')

        await event.sendMessage('-- Searching Guild --')

        filter.forEach(async(u) => {
          let user = await disclient.guilds.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else {
          return await event.sendMessage('ERROR!')
      }
    } else if(cmd === 'chnl') {
      let type = args[0].toLowerCase()
      let str = args.splice(1).join(' ')

      if(!type || !str) return await event.sendMessage('Not complete')

      let data = db.get('info')

      if(!data.server) return await event.sendMessage('CANNOT VALIDATE!')

      let server = await disclient.guilds.fetch(data.server)

      if(!server) return await event.sendMessage('Error!')

      if(type === 'includes') {
        let fetched = server.channels.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.includes(str))

        if(!filter.join('')) return await event.sendMessage('Did not find channel!')

        await event.sendMessage('-- Searching Channel --')

        filter.forEach(async(u) => {
          let user = await server.channels.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'starts') {
        let fetched = server.channels.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.startsWith(str))

        if(!filter.join('')) return await await event.sendMessage('Did not find channel!')

        await event.sendMessage('-- Searching Channel --')

        filter.forEach(async(u) => {
          let user = await server.channels.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'ends') {
        let fetched = server.channels.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name.endsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find channel!')

        await event.sendMessage('-- Searching Channel --')

        filter.forEach(async(u) => {
          let user = await server.channels.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'equal') {
        let fetched = server.channels.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.name === (str))

        if(!filter.join('')) return await event.sendMessage('Did not find channel!')

        await event.sendMessage('-- Searching Channel --')

        filter.forEach(async(u) => {
          let user = await server.channels.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else if(type === 'id') {
        let fetched = server.channels.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.id === (str))

        if(!filter.join('')) return await event.sendMessage('Did not find channel!')

        await event.sendMessage('-- Searching Channel --')

        filter.forEach(async(u) => {
          let user = await server.channels.fetch(u.id)

          await event.sendMessage('-> '+user.name+'@'+user.id)
        })
      } else {
          return await event.sendMessage('ERROR!')
      }
    } else if(cmd === 'usr') {
      let type = args[0].toLowerCase()
      let str = args.splice(1).join(' ')

      if(!type || !str) return await event.sendMessage('Not complete')

      if(type === 'includes') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.username.includes(str))

        if(!filter.join('')) return await event.sendMessage('Did not find user!')

        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else if(type === 'starts') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.username.startsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find user!')

        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else if(type === 'ends') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.username.endsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find user!')

        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else if(type === 'equal') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.username === (str))

        if(!filter.join('')) return await event.sendMessage('Did not find user!')

        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else if(type === 'tag') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => u.tag.startsWith(str))

        if(!filter.join('')) return await event.sendMessage('Did not find user!')

        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else if(type === 'discriminator') {
        let fetched = disclient.users.cache.map((v) => { return v })
        let filter = fetched.filter(u => String(u.discriminator) === str)

        if(!filter.join('')) return await event.sendMessage('Did not find user!')
        
        await event.sendMessage('-- Searching User --')

        filter.forEach(async(u) => {
          let user = await disclient.users.fetch(u.id)

          await event.sendMessage('-> '+user.tag+'@'+user.id)
        })
      } else {
        return await event.sendMessage('ERROR!')
      }
    } else if(cmd === 'reply') {
      let mid = args[0]
      let text = args.splice(1).join(' ')

      if(!mid || !text) return await event.sendMessage('Not complete')

      let data = db.get('info')

      if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      if(data.type === 'dm') {
        let user = await disclient.users.fetch(data.id)

        if(!user) return await event.sendMessage('INVALID USER '+data.id)

        if(!user.dmChannel) return await event.sendMessage('NO DMS YET USER '+data.id)

        let messages = await user.dmChannel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.reply(text)
      } else if(data.type === 'channel') {
        if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')

        let server = await disclient.guilds.fetch(data.server)

        if(!server) return await eventMessage('INVALID SERVER')
  
        let channel = await server.channels.fetch(data.id)
    
        if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)
        
        let messages = await channel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.reply(text)
      }
    } else if(cmd === "file") {
      let file = args[0]
      let url = args.slice(1).join('')

      if(!file || !url) return await event.sendMessage('CANNOT VALIDATE')

      await exec('wget -O '+file+' '+url)

      if(fs.existsSync('./'+file) === false) return await event.sendMessage('TRY AGAIN')

      let data = db.get('info')

      if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      if(data.type === 'dm') {
        let user = await disclient.users.fetch(data.id)

        if(!user) return await event.sendMessage('INVALID USER '+data.id)

        user.send({ files: ['./'+file] })
      } else if(data.type === 'channel') {
        if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')

        let server = await disclient.guilds.fetch(data.server)

        if(!server) return await event.sendMessage('INVALID SERVER')
  
        let channel = await server.channels.fetch(data.id)

        if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)
        
        channel.send({ files: ['./'+file] })
      }

      await event.sendMessage('DONE SENDING FILE!')

      if(fs.existsSync('./'+file) === true) return fs.unlinkSync('./'+file)
    } else if(cmd === 'react') {
      let mid = args[0]
      let text = args.splice(1).join(' ')

      if(!mid || !text) return await event.sendMessage('Not complete')

      let data = db.get('info')

      if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      if(data.type === 'dm') {
        let user = await disclient.users.fetch(data.id)

        if(!user) return await event.sendMessage('INVALID USER '+data.id)

        if(!user.dmChannel) return await event.sendMessage('NO DMS YET USER '+data.id)

        let messages = await user.dmChannel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.react(text)
      } else if(data.type === 'channel') {
        if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')

        let server = await disclient.guilds.fetch(data.server)

        if(!server) return await event.sendMessage('INVALID SERVER')
  
        let channel = await server.channels.fetch(data.id)

        if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)
        
        let messages = await channel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.react(text)
      }
    } else if(cmd === "unreact") {
      let mid = args[0]
      let text = args.splice(1).join(' ')

      if(!mid || !text) return await event.sendMessage('Not complete')

      let data = db.get('info')

      if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      if(data.type === 'dm') {
        let user = await disclient.users.fetch(data.id)

        if(!user) return await event.sendMessage('INVALID USER '+data.id)

        if(!user.dmChannel) return await event.sendMessage('NO DMS YET USER '+data.id)

        let dmchnl = user.dmChannel
        let messages = await dmchnl.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        try {
          message.reactions.resolve(text).users.remove(disclient.user.id)
        } catch (e) {
          return await event.sendMessage('ERROR! '+e)
        }
      } else if(data.type === 'channel') {
        if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')

        let server = await disclient.guilds.fetch(data.server)

        if(!server) return await event.sendMessage('INVALID SERVER')
  
        let channel = await server.channels.fetch(data.id)

        if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)
        
        let messages = await channel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        try {
          message.reactions.resolve(text).users.remove(client.user.id)
        } catch (e) {
          return await event.sendMessage('ERROR! '+e)
        }
      }
    } else if(cmd === 'delete') {
      let mid = args[0]

      if(!mid) return await event.sendMessage('Not complete')

      let data = db.get('info')

      if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      if(data.type === 'dm') {
        let user = await disclient.users.fetch(data.id)

        if(!user) return await event.sendMessage('INVALID USER '+data.id)

        if(!user.dmChannel) return await event.sendMessage('NO DMS YET USER '+data.id)

        let messages = await user.dmChannel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.delete()
      } else if(data.type === 'channel') {
        if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')

        let server = await disclient.guilds.fetch(data.server)

        if(!server) return await event.sendMessage('INVALID SERVER')
  
        let channel = await server.channels.fetch(data.id)
        
        if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)
        
        let messages = await channel.messages.fetch()
        let message = messages.find(m => m.id === mid)

        if(!message) return await event.sendMessage('INVALID MESSAGE ID')

        message.delete()
      }
    } else if(cmd === 'invitecurrent') {
      let data = db.get('info')
      
      if(!data.server) return await event.sendMessage('CANNOT VALIDATE')

      if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

      let server = await disclient.guilds.fetch(data.server)
      let channel = await server.channels.fetch(data.id)

      if(!server) return await event.sendMessage('INVALID SERVER')
      if(!channel) return await event.sendMessage('INVALID CHANNEL')

      let format = "Invite Link Of $:CHANNEL In $:SERVER: $:LINK"

      let inv = await getInvite(server, data.id)

      let send = format
      .replace('$:SERVER', '<'+server.id+'>@'+server.name)
      .replace('$:CHANNEL', '<'+channel.id+'>@'+channel.name)  
      .replace('$:LINK', inv)

      return await event.sendMessage(send)
    } else {
      return await event.sendMessage('CANNOT COMPLETE ACTION')
    }
    
    return await event.sendMessage('COMPLETE')
  } else if(Array.isArray(event.message.attachments)) {
    event.message.attachments.forEach(async(v) => {
      await event.sendMessage('URL: '+v.payload.url)
    })

    return event.sendMessage('COMPLETE')
  }

  let data = db.get('info')

  if(!data.type) return await event.sendMessage('CANNOT VALIDATE')
  if(!data.id) return await event.sendMessage('CANNOT VALIDATE')

  if(event.message.text.length > 1700) return await event.sendMessage('Sorry! Discord only allows 2000 characters maximum')

  if(data.type === "dm") {
    let user = await disclient.users.fetch(data.id)

    if(!user) return await event.sendMessage('INVALID USER '+data.id)
    
    user.send(format2.replace('$:MESSAGE', event.message.text))

    return await event.sendMessage('Complete Message Sent to '+user.tag)
  } else if(data.type === "channel") {
    if(!data.server) return await event.sendMessage('ERROR SENDING MESSAGE')
    
    let server = await disclient.guilds.fetch(data.server)

    if(!server) return await event.sendMessage('INVALID SERVER')
    
    let channel = await server.channels.fetch(data.id)

    if(!channel) return await event.sendMessage('CANNOT FIND CHANNEL '+data.id+' in '+data.server+' '+server.name)

    channel.send(format2.replace('$:MESSAGE', event.message.text))

    return await event.sendMessage('Complete Message Sent to '+channel.name)
  } else {
    return await event.sendMessage('ERROR SENDING MESSAGE')
  }
})

let master = mesclient

// New Discord Message
disclient.on('messageCreate', async(message) => {
  if(!db.get('info')) db.set('info', {})

  message.content = message.cleanContent || message.content || 'Message Sent.'

  let data = db.get('info')

  let channel = dataformat
  .replace('$:ID', message.channel.id || 'DM')
  .replace('$:NAME', message.channel.name || 'DM')

  let server = dataformat
  .replace('$:ID', message.guild ? message.guild.id : 'DM')
  .replace('$:NAME', message.guild ? message.guild.name : 'DM')

  let tag = dataformat
  .replace('$:ID', message.author.id || 'Wat')
  .replace('$:NAME', message.author.tag || '69')

  if(data.mutes) {
    if(data.mutes[message.guild ? message.guild.id : message.author.id]) {
      return
    } else {
      await job()
    }
  } else {
    await job()
  }

  async function job() {
    if(String(process.env.AUTOUPDATE) === "true") {
      if(message.guild) {
        let channel = message.channel
        let server = message.guild

        let newdata = {
          type: 'channel',
          id: channel.id,
          server: server.id
        }

        db.set('info', newdata)
      } else {
        let data = db.get('info')
        
        let author = message.author.id === disclient.user.id ? data.id : message.author.id
      
        let newdata = {
          type: 'dm',
          id: author
        }

        db.set('info', newdata)
      }
    }
      
    
    if(message.content.startsWith('ts!')) {
      let splitted = message.content.replace('ts!', '').split(' ').filter(v => v !== '')
      
      let cmd = splitted[0]
      let args = splitted.splice(1)

      if(cmd === 'inviteme') {
        let embed = new EmbedBuilder()
        .setTitle('Invite Me?')
        .setDescription('You can invite me to any of your server with my invite link\n\n[Invite Me!]('+process.env.INVITE+')\n\nDont worry this just my way to interact on discord!')
        .setColor(0xADD8E6)
        .setFooter({ text: message.author.tag+' | ill remove this message in 10 seconds for safety' })

        message.reply({ embeds: [embed] }).then(m => setTimeout(() => {
          m.edit('Deleting it...')
          m.delete()
        }, 10000))
      } else if(cmd === 'ping') {
        message.reply('🏓 Latency '+(Date.now() - message.createdTimestamp)+'ms, Api Latency '+disclient.ws.ping+'ms')
      } else {
        return message.reply('Cannot complete action!')
      }
      
      return message.reply('Done!')
    }
    
    if(isValidURL(message.content)) {
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Attachment Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)
      await master.sendFileTo(message.content, 'file', process.env.MYID)
    } else if(Array.isArray(message.embeds) && message.embeds.length) {
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Embed Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)

      await master.sendMessageTo('Getting all embeds!', process.env.MYID)

      message.embeds.map(async(v, i) => {
        let title = v.title || 'No Title'
        
        let url = v.url || 'No Url'
        
        let description = v.description || 'This is an embed'

        let author = v.author ? v.author : {}
        let iconUrl = author.icon_url ? author.icon_url : message.author.displayAvatarURL({})
        
        let name = author.name ? author.name : message.author.tag

        let thumbnail = v.thumbnail ? v.thumbnail : {}
        let thumburl = thumbnail.url ? thumbnail.url : false
        
        let fieldS = await fields(v.fields ? v.fields : [])
        
        let footer = v.footer || {}
        let footerUrl = footer.icon_url ? footer.icon_url : false
        let footerText = footer.text ? footer.text : false
        
        let img = v.image || {}
        let imgurl = img.url ? img.url : false

        let format = "-- Embed --\n\nEmbedNum: $:NUM\n\nSender: $:USR\n\nTitle: $:1\n\nUrl: $:2\n\nDescription: $:3\n\nFields:\n$:4\n\nFooter: $:5"

        let send = format
        .replace('$:1', title)
        .replace('$:2', url)
        .replace('$:3', truncate(description, 1000))
        .replace('$:4', fieldS)
        .replace('$:5', footerText)
        .replace('$:USR', name)
        .replace('$:NUM', i)

        let my = process.env.MYID

        await mesclient.sendMessageTo(send, process.env.MYID)

        if(iconUrl) {
          await mesclient.sendMessageTo('Authors Url In Embed '+i, my)
          await mesclient.sendFileTo(iconUrl, 'image', my)
        }

        if(thumburl) {
          await mesclient.sendMessageTo('Thumbnail In Embed '+i, my)
          await mesclient.sendFileTo(thumburl, 'image', my)
        }

        if(imgurl) {
          await mesclient.sendMessageTo('Image In Embed '+i, my)
          await mesclient.sendFileTo(imgurl, 'image', my)
        }

        if(footerUrl) {
          await mesclient.sendMessageTo('Footer Url In Embed '+i, my)
          await mesclient.sendFileTo(footerUrl, 'image', my)
        }

        return v
      })
    } else if(message.attachments) {   
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Attachment Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)

      message.attachments.map(async(v) => {
        await master.sendFileTo(v.url, 'file', process.env.MYID)

        return v
      })
    } else {
      console.log(isValidURL(message.content))

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let text = "Message: $:MESSAGE\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Message Sent.', 1450))
      .replace('$:ID', message.id)

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)

      await master.sendMessageTo(send, process.env.MYID)
    }
  }
})

// Edit discord message
disclient.on('messageUpdate', async(old, message) => {
  if(!db.get('info')) db.set('info', {})

  message.content = message.cleanContent || message.content || 'Message Sent.'

  let data = db.get('info')

  let channel = dataformat
  .replace('$:ID', message.channel.id || 'DM')
  .replace('$:NAME', message.channel.name || 'DM')

  let server = dataformat
  .replace('$:ID', message.guild ? message.guild.id : 'DM')
  .replace('$:NAME', message.guild ? message.guild.name : 'DM')

  let tag = dataformat
  .replace('$:ID', message.author.id || 'Wat')
  .replace('$:NAME', message.author.tag || '69')

  await mesclient.sendMessageTo(tag+' edited a message')

  if(data.mutes) {
    if(data.mutes[message.guild ? message.guild.id : message.author.id]) {
      return
    } else {
      await job()
    }
  } else {
    await job()
  }

  async function job() {
    if(String(process.env.AUTOUPDATE) === "true") {
      if(message.guild) {
        let channel = message.channel
        let server = message.guild

        let newdata = {
          type: 'channel',
          id: channel.id,
          server: server.id
        }

        db.set('info', newdata)
      } else {
        let data = db.get('info')
        
        let author = message.author.id === disclient.user.id ? data.id : message.author.id
      
        let newdata = {
          type: 'dm',
          id: author
        }

        db.set('info', newdata)
      }
    }
      
    
    /*if(message.content.startsWith('ts!')) {
      let splitted = message.content.replace('ts!', '').split(' ').filter(v => v !== '')
      
      let cmd = splitted[0]
      let args = splitted.splice(1)

      if(cmd === 'inviteme') {
        let embed = new EmbedBuilder()
        .setTitle('Invite Me?')
        .setDescription('You can invite me to any of your server with my invite link\n\n[Invite Me!]('+process.env.INVITE+')\n\nDont worry this just my way to interact on discord!')
        .setColor(0xADD8E6)
        .setFooter({ text: message.author.tag+' | ill remove this message in 10 seconds for safety' })

        message.reply({ embeds: [embed] }).then(m => setTimeout(() => {
          m.edit('Deleting it...')
          m.delete()
        }, 10000))
      } else if(cmd === 'ping') {
        message.reply('🏓 Latency '+(Date.now() - message.createdTimestamp)+'ms, Api Latency '+disclient.ws.ping+'ms')
      } else {
        return message.reply('Cannot complete action!')
      }
      
      return message.reply('Done!')
    }*/
    
    if(isValidURL(message.content)) {
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Attachment Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)
      await master.sendFileTo(message.content, 'file', process.env.MYID)
    } else if(Array.isArray(message.embeds) && message.embeds.length) {
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Embed Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)

      await master.sendMessageTo('Getting all embeds!', process.env.MYID)

      message.embeds.map(async(v, i) => {
        let title = v.title || 'No Title'
        
        let url = v.url || 'No Url'
        
        let description = v.description || 'This is an embed'

        let author = v.author ? v.author : {}
        let iconUrl = author.icon_url ? author.icon_url : message.author.displayAvatarURL({})
        
        let name = author.name ? author.name : message.author.tag

        let thumbnail = v.thumbnail ? v.thumbnail : {}
        let thumburl = thumbnail.url ? thumbnail.url : false
        
        let fieldS = await fields(v.fields ? v.fields : [])
        
        let footer = v.footer || {}
        let footerUrl = footer.icon_url ? footer.icon_url : false
        let footerText = footer.text ? footer.text : false
        
        let img = v.image || {}
        let imgurl = img.url ? img.url : false

        let format = "-- Embed --\n\nEmbedNum: $:NUM\n\nSender: $:USR\n\nTitle: $:1\n\nUrl: $:2\n\nDescription: $:3\n\nFields:\n$:4\n\nFooter: $:5"

        let send = format
        .replace('$:1', title)
        .replace('$:2', url)
        .replace('$:3', truncate(description, 1000))
        .replace('$:4', fieldS)
        .replace('$:5', footerText)
        .replace('$:USR', name)
        .replace('$:NUM', i)

        let my = process.env.MYID

        await mesclient.sendMessageTo(send, process.env.MYID)

        if(iconUrl) {
          await mesclient.sendMessageTo('Authors Url In Embed '+i, my)
          await mesclient.sendFileTo(iconUrl, 'image', my)
        }

        if(thumburl) {
          await mesclient.sendMessageTo('Thumbnail In Embed '+i, my)
          await mesclient.sendFileTo(thumburl, 'image', my)
        }

        if(imgurl) {
          await mesclient.sendMessageTo('Image In Embed '+i, my)
          await mesclient.sendFileTo(imgurl, 'image', my)
        }

        if(footerUrl) {
          await mesclient.sendMessageTo('Footer Url In Embed '+i, my)
          await mesclient.sendFileTo(footerUrl, 'image', my)
        }

        return v
      })
    } else if(message.attachments) {   
      let text = "Message: \"$:MESSAGE\"\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Attachment Sent.', 1450))
      .replace('$:ID', message.id)

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)
      
      await master.sendMessageTo(send, process.env.MYID)

      message.attachments.map(async(v) => {
        await master.sendFileTo(v.url, 'file', process.env.MYID)

        return v
      })
    } else {
      console.log(isValidURL(message.content))

      let ct = message.reference ? (await message.channel.messages.fetch(message.reference.messageId)).cleanContent : 'NOOOO'
      let replied = message.reference ? '\n- Message: "'+ct+'"\n- ID: '+message.reference.messageId : 'false'

      let text = "Message: $:MESSAGE\n\nId: $:ID"
      .replace('$:MESSAGE', truncate(message.content || 'Message Sent.', 1450))
      .replace('$:ID', message.id)

      let send = format1
      .replace('$:SERVER', server)
      .replace('$:CHANNEL', channel)
      .replace('$:TAG', tag)
      .replace('$:MESSAGE', text)
      .replace('$:REPLIED', replied)

      await master.sendMessageTo(send, process.env.MYID)
    }
  }
})

// New Guild
disclient.on('guildCreate', async(guild) => {
  let my = process.env.MYID

  let format = "-- Invited Me In Guild --\nName: $NAME\nID: $ID\nMemberCount: $CT\nInvite Link: $:INVITE"

  let formatted = format
  .replace('$:NAME', guild.name)
  .replace('$:ID', guild.id)
  .replace('$:CT', guild.memberCount)
  .replace('$:INVITE', (await getInvite(guild)))

  await mesclient.sendMessageTo(formatted, my)
})

// Leaved a guild
disclient.on('guildDelete', async(guild) => {
  let my = process.env.MYID

  let format = "-- Leaved Guild --\nName: $NAME\nID: $ID\nMemberCount: $CT\nInvite Link: $:INVITE"

  let formatted = format
  .replace('$:NAME', guild.name)
  .replace('$:ID', guild.id)
  .replace('$:CT', guild.memberCount)
  .replace('$:INVITE', (await getInvite(guild)))

  await mesclient.sendMessageTo(formatted, my)
})

// New Member
disclient.on('guildMemberAdd', async(guild, member) => {
  let my = process.env.MYID

  let format = "-- New User In Guild --\nUser: $USER\nID: $ID\nGuild:\n- Name: $NAME\n- ID: $ID\n- MemberCount: $CT"

  let formatted = format
  .replace('$:USER', member.user.tag)
  .replace('$:NAME', guild.name)
  .replace('$:ID', guild.id)
  .replace('$:CT', guild.memberCount)

  await mesclient.sendMessageTo(formatted, my)
})

// Leave member
disclient.on('guildMemberRemove', async(guild, member) => {
  let my = process.env.MYID

  let format = "-- User Leaved In Guild --\nUser: $USER\nID: $ID\nGuild:\n- Name: $NAME\n- ID: $ID\n- MemberCount: $CT"

  let formatted = format
  .replace('$:USER', member.user.tag)
  .replace('$:NAME', guild.name)
  .replace('$:ID', guild.id)
  .replace('$:CT', guild.memberCount)

  await mesclient.sendMessageTo(formatted, my)
})

// Typing start
disclient.on('typingStart', async(stl) => {
  let data = db.get('info')

  if(!data) db.set('info', {})

  let st = JSON.parse(
    JSON.stringify(stl)
  )
  
  let user = await disclient.users.fetch(String(st.user).replace('<@', '').replace('>', ''))
  let channel = await disclient.channels.fetch(String(st.channel).replace('<@', '').replace('>', ''))
  
  if(data.server) {
    let server = await disclient.guilds.fetch(data.server) || '@DM'
    let ch = channel.name ? channel.name : '@DM'

    if(channel.id !== data.id) return
    if(data.mutes && data.mutes[server.id]) return
    
    await mesclient.sendMessageTo(user.tag+' is typing in channel '+ch+' in server '+server.name, process.env.MYID)
  } else {
    if(user.id !== data.id) return
    if(data.mutes && data.mutes[user.id]) return
    
    let ch = channel.name ? channel.name : '@DM'
    
    await mesclient.sendMessageTo(user.tag+' is typing in channel '+ch, process.env.MYID)
  }
})

// USELESSS
disclient.on('typingStop', async(stl) => {
  let data = db.get('info')

  if(!data) db.set('info', {})

  let st = JSON.parse(
    JSON.stringify(stl)
  )
  
  let user = await disclient.users.fetch(String(st.user).replace('<@', '').replace('>', ''))
  let channel = await disclient.channels.fetch(String(st.channel).replace('<@', '').replace('>', ''))
  
  if(data.server) {
    let server = await disclient.guilds.fetch(data.server) || '@DM'
    let ch = channel.name ? channel.name : '@DM'
    
    await mesclient.sendMessageTo(user.tag+' is stoped typing in channel '+ch+' in server '+server.name, process.env.MYID)
  } else {
    let ch = channel.name ? channel.name : '@DM'
    
    await mesclient.sendMessageTo(user.tag+' is stoped typing in channel '+ch || '@DM', process.env.MYID)
  }
})

// new reaction
disclient.on('messageReactionAdd', async(reaction, user) => {
  let data = db.get('info')

  if(!data) return

  let format = "Server: $:SRV\n\nChannel: $:CH\n\n$:USER Reacted $:EMOJI<$:TYPE> In Message\n$:MESSAGE"

  let dataformat = "<$:1>@$:2"
  let messageformat = "- ID: $:1\n- Message: $:2"

  if(data.type === 'dm') {
    let id = data.id

    if(!id) return

    let ch = (await disclient.users.fetch(id)).dmChannel
    let realusr = await disclient.users.fetch(id)

    if(!ch) return

    let dta = reaction._emoji || reaction.emoji || { id: 'no', name: 'no' }
    let idm = reaction.message.id

    let server = "<dm>@DM"
    let channel = "<"+id+">@DM"

    let msg = await ch.messages.fetch(idm)

    if(!msg) return

    let type = dta.animated ? 'ANIMATED' : 'NORMAL'

    let message = messageformat
    .replace('$:1', msg.id)
    .replace('$:2', msg.cleanContent)

    let emoji = dataformat
    .replace('$:1', dta.id || dta.name)
    .replace('$:2', dta.name)

    let send = format
    .replace('$:SRV', server)
    .replace('$:CH', channel)
    .replace('$:USER', realusr.tag)
    .replace('$:EMOJI', emoji)
    .replace('$:TYPE', type)
    .replace('$:MESSAGE', message)

    await mesclient.sendMessageTo(send, process.env.MYID)
  } else if(data.type === 'channel') {
    let id = data.id

    if(!id) return

    let ch = (await disclient.channels.fetch(id))
    let realchl = await disclient.channels.fetch(id)

    if(!ch) return

    let dta = reaction._emoji || reaction.emoji || { id: 'no', name: 'no', animated: false }
    let idm = reaction.message.id

    let msg = await ch.messages.fetch(idm)

    if(!msg) return

    let server = dataformat
    .replace('$:1', msg.guild.id)
    .replace('$:2', msg.guild.name)

    let channel = dataformat
    .replace('$:1', msg.channel.id)
    .replace('$:2', msg.channel.name)

    let type = dta.animated ? 'ANIMATED' : 'NORMAL'

    let message = messageformat
    .replace('$:1', msg.id)
    .replace('$:2', msg.cleanContent)

    let emoji = dataformat
    .replace('$:1', dta.id || dta.name)
    .replace('$:2', dta.name)

    let send = format
    .replace('$:SRV', server)
    .replace('$:CH', channel)
    .replace('$:USER', realchl.tag)
    .replace('$:EMOJI', emoji)
    .replace('$:TYPE', type)
    .replace('$:MESSAGE', message)

    await mesclient.sendMessageTo(send, process.env.MYID)
  }
})

// remove reaction
disclient.on('messageReactionRemove', async(reaction, user) => {
  let data = db.get('info')

  if(!data) return

  let format = "Server: $:SRV\n\nChannel: $:CH\n\n$:USER Removed reaction $:EMOJI<$:TYPE> In Message\n$:MESSAGE"

  let dataformat = "<$:1>@$:2"
  let messageformat = "- ID: $:1\n- Message: $:2"

  if(data.type === 'dm') {
    let id = data.id

    if(!id) return

    let ch = (await disclient.users.fetch(id)).dmChannel
    let realusr = await disclient.users.fetch(id)

    if(!ch) return

    let dta = reaction._emoji || reaction.emoji || { id: 'X', name: 'X' }
    let idm = reaction.message.id

    let server = "<dm>@DM"
    let channel = "<"+id+">@DM"

    let msg = await ch.messages.fetch(idm)

    if(!msg) return

    let type = dta.animated ? 'ANIMATED' : 'NORMAL'

    let message = messageformat
    .replace('$:1', msg.id)
    .replace('$:2', msg.cleanContent)

    let emoji = dataformat
    .replace('$:1', dta.id || dta.name)
    .replace('$:2', dta.name)

    let send = format
    .replace('$:SRV', server)
    .replace('$:CH', channel)
    .replace('$:USER', realusr.tag)
    .replace('$:EMOJI', emoji)
    .replace('$:TYPE', type)
    .replace('$:MESSAGE', message)

    await mesclient.sendMessageTo(send, process.env.MYID)
  } else if(data.type === 'channel') {
    let id = data.id

    if(!id) return

    let ch = (await disclient.channels.fetch(id))
    let realchl = await disclient.channels.fetch(id)

    if(!ch) return

    let dta = reaction._emoji || reaction.emoji || { id: 'no', name: 'no', animated: false }
    let idm = reaction.message.id

    let msg = await ch.messages.fetch(idm)

    if(!msg) return

    let server = dataformat
    .replace('$:1', msg.guild.id)
    .replace('$:2', msg.guild.name)

    let channel = dataformat
    .replace('$:1', msg.channel.id)
    .replace('$:2', msg.channel.name)

    let type = dta.animated ? 'ANIMATED' : 'NORMAL'

    let message = messageformat
    .replace('$:1', msg.id)
    .replace('$:2', msg.cleanContent)

    let emoji = dataformat
    .replace('$:1', dta.id || dta.name)
    .replace('$:2', dta.name)

    let send = format
    .replace('$:SRV', server)
    .replace('$:CH', channel)
    .replace('$:USER', realchl.tag)
    .replace('$:EMOJI', emoji)
    .replace('$:TYPE', type)
    .replace('$:MESSAGE', message)

    await mesclient.sendMessageTo(send, process.env.MYID)
  }
})

// USEFUL FUNCTIONS
function getInvite(server, chi) {
  if(chi) {
    return new Promise(async(resolve) => {
      let chl = await server.channels.fetch(chi)
      
      chl.createInvite()
      .then((invite) => resolve(invite.url))
      .catch(() => resolve('No Invite'))
    })
    return
  }
  
  return new Promise(async(resolve) => {
    let chlist = await server.channels.fetch()
    let charray = chlist.map((v) => { return v })
    let ch = charray.filter(c => c.type === 0)

    if(!ch[0]) return resolve('No Invite')

    let realch = await server.channels.fetch(ch[0].id)
    
    realch.createInvite()
    .then((invite) => resolve(invite.url))
    .catch(() => resolve('No Invite'))
  })
}

function truncate(string, length) {
  if(string.length < length) {
    return string
  }

  return string.slice(0, length)+'...'
}

function isValidURL(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:"
}

function run(command) {
  return new Promise(async(resolve) => {
    let exec = util.promisify( require('child_process').exec )

    await exec(command)

    resolve()
  })
}

function exec(command) {
  return new Promise(resolve => {
    let cmd = command.split(' ')[0]
    let args = command.split(' ').splice(1)

    let e = spawn(cmd, args)

    e.on('exit', async() => {
      resolve()
    })
  })
}

function fields(arr) {
  return new Promise(resolve => {
    if(Array.isArray(arr) && arr.length) {
      let mapped = arr.map((d, i) => {
        let name = d.name || 'noname'
        let value = d.value || 'noval'

        return '- '+name+':'+value
      })

      resolve(mapped.join('\n'))
    } else {
      resolve('- There is no fields!')
    }
  })
}