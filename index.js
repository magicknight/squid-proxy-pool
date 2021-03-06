const Koa = require('koa')
const Router = require('koa-router')
const path = require('path')
const fs = require('fs')
const utils = require('./utils')
const markdown = require('koa-markdown')
const convert = require('koa-convert')

const confPath = '/etc/squid/peers.conf'

const router = new Router()

router.get('/proxies', (ctx, next) => {
  let conf = fs.readFileSync(confPath, 'utf-8')
  ctx.body = {
    conf: conf
  }
})

router.post('/proxies', (ctx, next) => {
  let proxies = ctx.request.body.filter(s => utils.testProxyStr(s))
  let conf = proxies.map(s => utils.parseProxyStrToSquidConf(s)).join('\n')
  fs.writeFileSync(confPath, conf)
  ctx.body = {
    proxies: proxies,
    conf: conf
  }
  ctx.status = 202
  require('child_process').exec('squid -k reconfigure', (err, stdout, stderr) => {
    if (err) {
      console.error('reconfigure squid fail', stderr)
    } else {
      console.log('reconfigure squid success', stdout)
    }
  })
})

const app = new Koa()
app.use(require('koa-bodyparser')())
app.use(async (ctx, next) => {
  const start = new Date()
  try {
    await next()
  } catch (e) {
    ctx.status = 500
    ctx.body = {
      code: -1,
      message: e.message
    }
  }
  const ms = new Date() - start
  ctx.set('X-Response-Time', `${ms}ms`)
})
console.log(path.join(__dirname))
app.use(convert(markdown({
  root: path.join(__dirname, '/'),
  indexName: 'README',
  baseUrl: '/'
})));
app
  .use(router.routes())
  .use(router.allowedMethods())
console.log('manager http listen on 3000')
app.listen(3000)
