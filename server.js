import bodyParser from 'body-parser'
import cors from 'cors'
import connection from './database'
import express from 'express'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import passport from 'passport'
import passportJWT from 'passport-jwt'
import { findIndex } from 'lodash'
// routes
import channel from './routes/channel'
import demographic from './routes/demographic'
import migrate from './routes/migrate'
import netflow from './routes/netflow'
import portTotal from './routes/portTotal'
import portSummary from './routes/portSummary'
import product from './routes/product'
import wayCode from './routes/wayCode'

const app = express()

const users = [
  {
    id: 1,
    name: 'jonathanmh',
    password: '%2yx4'
  },
  {
    id: 2,
    name: 'test',
    password: 'test'
  }
]

const ExtractJwt = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy

const jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromHeader('authorization')
jwtOptions.secretOrKey = 'ittpMis'

const strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  console.log('payload received', jwt_payload)
  // usually this would be a database call:
  const user = users[findIndex(users, {id: jwt_payload.id})]
  if (user) {
    next(null, user)
  } else {
    next(null, false)
  }
})

passport.use(strategy)

app.use(passport.initialize())
app.use(bodyParser.urlencoded({
  extended: true
}))


app.use(bodyParser.json())
app.use(cors())
app.use('/channel', channel)
app.use('/demographic', demographic)
app.use('/portTotal',  portTotal)
app.use('/portSummary',  portSummary)
app.use('/netflow', netflow)
app.use('/product', product)
app.use('/wayCode', wayCode)
app.use('/migrate', migrate)

app.post("/login", function(req, res) {
  if(req.body.name && req.body.password){
    const name = req.body.name
    const password = req.body.password
        // usually this would be a database call:
    const user = users[findIndex(users, {name: name})]
    if( ! user ){
      res.status(401).json({message:"User doesn't exist"})
    } else {
      if(user.password === req.body.password) {
        // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
        const payload = {id: user.id}
        const token = jwt.sign(payload, jwtOptions.secretOrKey)
        res.status(200).json({token: token})
      } else {
        res.status(401).json({message:"Invalid username or password"})
      }
    }
  } else {
    res.status(400).send({message:"Please enter username and password"})
  }
})

app.listen(3000)