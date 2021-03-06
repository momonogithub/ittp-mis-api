import express from 'express'
import { coreConnection } from '../database'

const router = express.Router()

router.get('/getNameList', async function(req, res){
  try {
    const result = await queryProductName()
    res.status(200).send(result)
  } catch (err) {
    res.status(500).send(err)
  }
})

export const queryProductName = async () => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
      `SELECT product_id, product_name FROM Product 
        WHERE status = 'active' ORDER BY product_id ASC `,
      function(err, rows, fields) {
        if(!err){
          const nameList = {}
          rows.map(product => {
            nameList[`${product.product_id}`] = {
              name: product.product_name,
              status: true
            }
            return product
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