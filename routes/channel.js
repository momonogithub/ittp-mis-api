import express from 'express'
import connection from '../database'
import moment from 'moment'
import { startDate } from '../setting'
import { appByDate } from './query'
import { uniqBy, groupBy, values, keys } from 'lodash'

const router = express.Router()

router.get("/:month/:year", async function(req, res){
  const { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').add(1, 'month')
  const result = await getChennel(date)
  res.send(result)
})

const getChennel = async date => {
  const result = []
  const start = date.format("YYYY/MM/DD")
  // const applications = await appByDate(startDate, start)
  const applications = [
    { Id: 1, wayCode: 'B001', product_id: '1001', waitConfirmTimestamp: new Date()},
    { Id: 2, wayCode: 'B001', product_id: '1002', waitConfirmTimestamp: null},
    { Id: 3, wayCode: 'B001', product_id: '1001', waitConfirmTimestamp: null},
    { Id: 4, wayCode: 'B002', product_id: '1002', waitConfirmTimestamp: null},
    { Id: 5, wayCode: 'B002', product_id: '1003', waitConfirmTimestamp: new Date()},
    { Id: 6, wayCode: 'HQ', product_id: '1002', waitConfirmTimestamp: null},
    { Id: 7, wayCode: 'HQ', product_id: '1003', waitConfirmTimestamp: new Date()},
    { Id: 8, wayCode: 'HQ', product_id: '1004', waitConfirmTimestamp: null},
    { Id: 9, wayCode: 'S001', product_id: '1003', waitConfirmTimestamp: new Date()},
    { Id: 10, wayCode: 'S001', product_id: '1004', waitConfirmTimestamp: null},
    { Id: 11, wayCode: 'S001', product_id: '1005', waitConfirmTimestamp: new Date()},
    { Id: 12, wayCode: 'S001', product_id: '1004', waitConfirmTimestamp: null},
    { Id: 13, wayCode: 'S001', product_id: '1005', waitConfirmTimestamp: new Date()},
    { Id: 14, wayCode: 'B001', product_id: '1001', waitConfirmTimestamp: null},
  ]
  const branch = {}
  const sellman = {}
  const applicationsGroup = groupBy(applications, 'wayCode')
  for(let item in applicationsGroup){
    const productResult = {}
    const productGroup = groupBy(applicationsGroup[item], 'product_id')
    for(let product in productGroup) {
      const count = productGroup[product].length
      let approved = 0
      productGroup[product].map(app => {
        if(app.waitConfirmTimestamp !== null) {
          approved += 1
        }
        return app
      })
      productResult[product] = {
        Application: count,
        Approved : approved,
        Percent : `${Math.ceil(approved/count * 10000)/100}%`
      }
    }
    if(item[0] === 'B' || item === 'HQ') {
      branch[item] = productResult
    } else {
      sellman[item] = productResult
    }
  }
  return {
    Branch: branch,
    Sellman: sellman
  }
}

export default router