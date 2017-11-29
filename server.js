import bcrypt from 'bcrypt'
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
import { getUserById, getUserByName, updateUserByName} from './routes/user'

const app = express()

const ExtractJwt = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy

const jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromHeader('authorization')
jwtOptions.secretOrKey = 'ittpMis'

const strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {  
  // usually this would be a database call:
  const users = await getUserById(jwt_payload.id)
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
app.use('/channel', passport.authenticate('jwt', { session: false }), channel)
app.use('/demographic', passport.authenticate('jwt', { session: false }), demographic)
app.use('/portTotal', passport.authenticate('jwt', { session: false }),  portTotal)
app.use('/portSummary', passport.authenticate('jwt', { session: false }),  portSummary)
app.use('/netflow', passport.authenticate('jwt', { session: false }), netflow)
app.use('/product', passport.authenticate('jwt', { session: false }), product)
app.use('/wayCode', passport.authenticate('jwt', { session: false }), wayCode)
app.use('/migrate', migrate)

app.post("/login", async function(req, res) {
  if(req.body.name && req.body.password){
    const name = req.body.name
    const password = req.body.password
        // usually this would be a database call:
    const users = await getUserByName(name)
    const user = users[findIndex(users, {username: name})]
    if( ! user ){
      res.status(401).json({message:"User doesn't exist"})
    } else {
      const compare = await bcrypt.compare(req.body.password, user.password)
      if(compare) {
        // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
        const payload = {id: user.id}
        const token = jwt.sign(payload, jwtOptions.secretOrKey)
        await updateUserByName({
          username: name,
          lastLoginDate: new Date(),
        })
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