import express from 'express'
import { coreConnection } from '../database'

const router = express.Router()

router.get('/getNameList', async function(req, res){
  try {
    const result = await getWayCode()
    res.status(200).send(result)
  } catch (err) {
    res.status(500).send(err)
  }
})

export const getWayCode = async () => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
      `SELECT DISTINCT wayCode AS wayCode 
        FROM Applications 
        ORDER BY Applications.wayCode ASC`,
      function(err, rows, fields) {
        if(!err){
          const nameList = {}
          rows.map(data => {
            if(data.wayCode !== null) {
              nameList[`${data.wayCode}`] = {
                status: false
              }
            }
            return data
          })
          resolve(nameList)
        } else {
          reject(err)
        }
      }
    )
  })
}

export default router