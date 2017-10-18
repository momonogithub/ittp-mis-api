import express from 'express'
import connection from '../database'

const router = express.Router()

router.get('/getNameList', async function(req, res){
  connection.query(
    `SELECT product_id, product_name FROM Product 
      WHERE status = 'active' `,
    function(err, rows, fields) {
      if(!err){
        const nameList = []
        rows.map(product => {
          const productJSON = {
            id: product.product_id,
            name: product.product_name,
            status: false
          }
          nameList.push(productJSON)
          return product
        })
        res.status(200).send(nameList)
      } else {
        res.status(500).send(err)
      }
    }
  )
})

export default router