import bcrypt from 'bcrypt'
import express from 'express'
import { misConnection } from '../database'
import { userTabel, username, password} from '../setting'

const router = express.Router()
const saltRounds = 10

export const intitialUser = async () => {
  try {
    const user = {
      username: username,
      password: password,
      createdDate: new Date(),
    }
    await addUser(user)
    return 'Intitial User Successful'
  } catch (err) {
    return err
  }
}

export const addUser = async user => {
  let name = ''
  let value = ''
  user.password = await bcrypt.hash(user.password, saltRounds)
  for(let item in user) {
    name = name.concat(`${item}, `)
    value = value.concat(`${misConnection.escape(user[item])}, `)
  }
  name = name.slice(0, name.length-2)
  value = value.slice(0, value.length-2)
  misConnection.query(`INSERT INTO ${userTabel} (${name}) VALUES (${value})`,
  function (err) {
    if (err) throw err
  })
}

export const getUser = async () => {
  return new Promise(function(resolve, reject) {
    misConnection.query(
      `SELECT * FROM ${userTabel}`,
      function(err, rows, fields) {
        if(!err){
          resolve(rows)
        } else {
          reject(err)
        }
      }
    )
  })
}

export const updateUserByName = async user => {
  let update = ''
  for(let item in user) {
    update = update.concat(`${item}=${misConnection.escape(user[item])}, `)
  }
  update = update.slice(0, update.length-2)
  misConnection.query(
    `UPDATE ${userTabel} SET ${update} WHERE username = ?`,
    [user.username]
  )
}

export default router