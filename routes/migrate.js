import express from 'express'
import connection from '../database'
import moment from 'moment'

const router = express.Router()

router.use('/mapAppWithLoan', async function(req, res) {
  try {
    const loans = await queryLoan()
    for(let i = 0 ; i < loans.length ; i += 1) {
      const [loanOpen, application] = await Promise.all([
        loanOpenByLoanId(loans[i].loan_id),
        appByCitizenId(loans[i].citizen_id),
      ])
      if(application.length !== 0) {
        const loanOpenTime = moment(loanOpen[0].trans_date).format('YYYY-MM-DD HH:mm:ss')
        const mapping = {
          productId : loans[i].product_id,
          // fill every timestamp with Loan open Date
          createdDate : loanOpenTime,
          lastModifiedDate : loanOpenTime,
          fillFormTimestamp : loanOpenTime,
          waitVerifyTimestamp : loanOpenTime,
          waitAnalystTimestamp : loanOpenTime,
          waitApproveTimestamp : loanOpenTime,
          waitConfirmTimestamp : loanOpenTime,
          waitTransferTimestamp : loanOpenTime,
          transferredTimestamp : loanOpenTime,
          transferredDate : loanOpenTime,
          wayCode : await checkWayCode(application[0].wayCode),
          education : await checkEducation(application[0].education),
          maritalStatus : await checkMarital(application[0].maritalStatus)
        }
        await updateAppById(mapping, application[0].id)
      }
    }
    res.status(200).send('Map Successful')
  } catch(error) {
    res.status(500).send(error)
  }
})

router.use('/mapNewApp', async function(req, res){
  try {
    const applications = await queryApplication()
    await Promise.all(
      applications.map(async app => {
        const newWayCode = await checkWayCode(app.wayCode)
        const newEducation = await checkEducation(app.education)
        const newMarital = await checkMarital(app.maritalStatus)
        const value = {
          education: newEducation,
          maritalStatus : newMarital,
          wayCode : newWayCode,
        }
        await updateAppById(value, app.id)
        return app
      })
    )
    console.log('Update Successful')
    res.status(200).send('Update Successful')
  } catch (err) {
    res.status(200).send(err)
  }
})

const queryLoan = async () => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Loan`,
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

const queryApplication = async () => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Applications`,
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

const loanOpenByLoanId = async loanId => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction WHERE trc = 'LO' AND loan_id = ? LIMIT 1`,
      [loanId],
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

const appByCitizenId = async citizenId => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Applications WHERE citizenId = ? AND createdDate IS NULL LIMIT 1`,
      [citizenId],
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

const updateAppById = async (mapData, appId) => {
  let update = ''
  for(let item in mapData) {
    update = update.concat(`${item}=${connection.escape(mapData[item])}, `)
  }
  update = update.slice(0, update.length-2)
  connection.query(`UPDATE Applications SET ${update} WHERE id = ?`,
  [appId],
  function (err) {
    console.log(`update ${appId}`)
    if (err) throw err
  })
}

const checkWayCode = async wayCode => {
  switch(wayCode) {
    case '็HQ' :
    case '้HQ' :
    case '็H':
    case null :
    case 'คุณจิระชัย' :
    case '' :
      return 'HQ'
    case '0001' :
    case 'B1' :
    case ' B0001' :
    case 'ฺB0001' :
    case 'ฺB1' :
    case 'ฺิB0001':
    case 'ฺฺB0001' :
      return 'B0001'
    case '0002' :
      return 'B0002'
    case 'S001' :
    case 'S1' :
    case 'IS001':
    case 'IS01':
      return 'S0001'
    case 'MGM1224' :
    case 'MGM-0722':
    case 'MGM-1132':
    case 'MGM-0251':
    case 'MGM-0338':
    case 'MGM-0362':
    case 'MGM-0631':
    case 'MGM-1162':
    case 'MGM-0305':
    case 'MGM-0362':
      return 'MGM'
    case 'KC Mahanakorn':
      return 'Staffcash'
    case "MGM-0362\r\n":
      return 'MGM-0362'
    case 'www':
    case 'www.':
    case 'WWW.':
      return 'WWW'
    default :
      return wayCode
  }
} 

const checkEducation = async education => {
  switch(education) {
    case 'ต่ำกว่ามัธยมปลาย':
    case null :
      return 'ต่ำกว่ามัธยมปลาย/ปวช.เทียบเท่า'
    case 'สูงกว่าปริญาตรี' :
      return 'สูงกว่าปริญญาโท'
    case 'อนุปริญญา' :
      return 'อนุปริญญา/ปวส./เทียบเท่า'
    default :
      return education
  }
}

const checkMarital = async marital => {
  switch(marital) {
    case null:
      return 'โสด'
    case 'สมรสไม่จดทะเบียน':
    case 'สมรสจดทะเบียน':
    case 'สมรสไม่จดทะเบียน':
    case 'สมรส (แยกกันอยู่)':
    case 'แยกกันอยู่':
    case 'สมรมไม่ได้จดทะเบียน':
    case 'สมรสไม่จดทะบียน':
    case 'สมรสไม่จดทะบียน':
    case 'สมรสไม่ได้จดทะเบียน':
    case 'สมรสไม่จดจะเบียน':
    case 'สมรสไม่พบข้อมูล':
    case 'สมรสไม่สดทะเบียน':
      return 'สมรส'
    default :
      return marital
  }
}

const checkBusinessType = async businessType => {
  switch(businessType) {
    case '':
      return 'รับราชการ'
    case '':
      return 'รัฐวิสาหกิจ'
    case '':
      return 'ธุรกิจก่อสร้าง'
    case 'สถาบันการเงิน':
      return 'ธุรกิจการเงิน'
    case '':
      return 'ธุรกิจการเกษตร'
    case 'ที่ปรึกษาเรื่องพลังงานทดแทน' :
      return 'ธุรกิจอุตสาหกรรม'
    case 'นำเข้า-ส่งออกโคมไฟ':
    case 'ค้าขาย':
    case 'สติ๊กเกอร์,ป้ายโฆษณา':
    case 'อุปกรณ์ในครัวเรือน,ของเล่น,ของใช้และอุปกรณ์ไฟฟ้า':
      return 'ธุรกิจพาณิชย์'
    case 'สำนักงานกฎหมาย':
    case 'นวดแผนไทย':
    case 'สำนักงานกฎหมาย ฟ้องคดีแพ่ง เร่งรัดหนี้สิน':
    case 'สำนักงานกฎหมาย (ให้คำปรึกษาด้านการเงิน)':
      return 'ธุรกิจให้บริการ'
    case '':
      return 'ธุรกิจโรงแรม'
    case '':
      return 'ธุรกิจการศึกษา'
    case '':
      return 'ห้างสรรพสินค้า/ซุปเปอร์มาร์เก็ต/ร้านค้าปลีก'
    case '':
      return 'อาหาร/เครื่องดื่ม/ภัตตาคาร'
    case '':
      return 'สถานเสริมความงาม/สุขภาพ'
    case '':
      return 'อื่นๆระบุ'
    default :
      return businessType
  }
}
export default router