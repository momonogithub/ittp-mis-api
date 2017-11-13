import { appByDate } from './query'
import { groupBy } from 'lodash'

export const demographicGroup = async (applications, date) => {
  //Gender
  const gender1 = 'Male'
  const gender2 = 'Female'

  //Loan Size
  const loanSize1 = '< 10000'
  const loanSize2 = '10000 - 20000'
  const loanSize3 = '20000 - 30000'
  const loanSize4 = '30000 - 40000'
  const loanSize5 = '40000 - 50000'
  const loanSize6 = '50000 - 60000'
  const loanSize7 = '60000 - 70000'
  const loanSize8 = '70000 - 80000'
  const loanSize9 = '80000 - 90000'
  const loanSize10 = '90000 - 100000'
  const loanSize11 = '> 100000'
  
  //Income
  const income1 = '< 8000'
  const income2 = '8000 - 10000'
  const income3 = '10000 - 12000'
  const income4 = '12000 - 15000'
  const income5 = '15000 - 20000'
  const income6 = '20000 - 30000'
  const income7 = '30000 - 40000'
  const income8 = '40000 - 50000'
  const income9 = '> 50000'

  //Age
  const age1 = '20 - 25'
  const age2 = '25 - 30'
  const age3 = '30 - 35'
  const age4 = '35 - 40'
  const age5 = '40 - 45'
  const age6 = '45 - 50'
  const age7 = '50 - 55'
  const age8 = '55 - 60'

  //region
  const region1 = 'BKK'
  const region2 = 'Central'
  const region3 = 'East'
  const region4 = 'Northeast'
  const region5 = 'South'
  const region6 = 'North'
  const region7 = 'West'

  //marital status
  const marital1 = 'โสด'
  const marital2 = 'สมรส'
  const marital3 = 'หย่า'
  const marital4 = 'หม้าย'

  //education
  const education1 = 'ต่ำกว่ามัธยมปลาย/ปวช.เทียบเท่า'
  const education2 = 'อนุปริญญา/ปวส./เทียบเท่า'
  const education3 = 'ปริญญาตรี'
  const education4 = 'สูงกว่าปริญญาโท'

  //Business
  const business1 = 'รับราชการ'
  const business2 = 'รัฐวิสาหกิจ'
  const business3 = 'ธุรกิจก่อสร้าง'
  const business4 = 'ธุรกิจการเงิน'
  const business5 = 'ธุรกิจการเกษตร'
  const business6 = 'ธุรกิจอุตสาหกรรม'
  const business7 = 'ธุรกิจพาณิชย์'
  const business8 = 'ธุรกิจให้บริการ'
  const business9 = 'ธุรกิจโรงแรม'
  const business10 = 'ธุรกิจการศึกษา'
  const business11 = 'ห้างสรรพสินค้า/ซุปเปอร์มาร์เก็ต/ร้านค้าปลีก'
  const business12 = 'อาหาร/เครื่องดื่ม/ภัตตาคาร'
  const business13 = 'สถานเสริมความงาม/สุขภาพ'
  const business14 = 'อื่นๆระบุ'

  //
  const job1 = 'ทหาร/ตำรวจ'
  const job2 = 'แพทย์'
  const job3 = 'พยาบาล'
  const job4 = 'พนักงานในสายการผลิต'
  const job5 = 'ธุรการ'
  const job6 = 'พนักงานบุคคล'
  const job7 = 'พนักงานบัญชี/การเงิน'
  const job8 = 'รักษาความปลอดภัย'
  const job9 = 'แม่บ้าน'
  const job10 = 'เจ้าของกิจการ'
  const job11 = 'เจ้าของกิจการ(จดทะเบียนนิติบุคคล)'
  const job12 = 'เจ้าของกิจการ(ไม่จดทะเบียนนิติบุคคล)'
  const job13 = 'พ่อค้า/แม่ค้า'
  const job14 = 'พนักงานขาย'
  const job15 = 'ขับแท็กซี่'
  const job16 = 'วินมอเตอร์ไซด์'
  const job17 = 'อื่นๆระบุ'

  //Employment
  const employment1 = 'พนักงานประจำ'
  const employment2 = 'พนักงานชั่วคราว'
  const employment3 = 'พนักงานรายวัน'

  //Demographic
  const total = { Total : applications}
  const month = await demographicMonth(date)
  const gender = {
    [gender1] : [],
    [gender2] : []
  }
  const loanSize = {
  [loanSize1] : [],
  [loanSize2] : [], 
  [loanSize3] : [],
  [loanSize4] : [],
  [loanSize5] : [],
  [loanSize6] : [],
  [loanSize7] : [],
  [loanSize8] : [],
  [loanSize9] : [],
  [loanSize10] : [],
  [loanSize11] : [],
  }
  const income = {
    [income1] : [],
    [income2] : [],
    [income3] : [],
    [income4] : [],
    [income5] : [],
    [income6] : [],
    [income7] : [],
    [income8] : [],
    [income9] : [], 
  }
  const age = {
    [age1] : [],
    [age2] : [],
    [age3] : [],
    [age4] : [],
    [age5] : [],
    [age6] : [],
    [age7] : [],
    [age8] : [],  
  }
  const region = {
    [region1] : [],
    [region2] : [],
    [region3] : [],
    [region4] : [],
    [region5] : [],
    [region6] : [],
    [region7] : []
  }
  const marital = {
    [marital1] : [],
    [marital2] : [],
    [marital3] : [],
    [marital4] : [],
  }
  const channel = groupBy(applications, 'wayCode')
  const education = {
    [education1] : [],
    [education2] : [],
    [education3] : [],
    [education4] : []
  }
  const business = {
    [business1] : [],
    [business2] : [],
    [business3] : [],
    [business4] : [],
    [business5] : [],
    [business6] : [],
    [business7] : [],
    [business8] : [],
    [business9] : [],
    [business10] : [],
    [business11] : [],
    [business12] : [],
    [business13] : [],
    [business14] : [],
  }
  const job = {
    [job1] : [],
    [job2] : [],
    [job3] : [],
    [job4] : [],
    [job5] : [],
    [job6] : [],
    [job7] : [],
    [job8] : [],
    [job9] : [],
    [job10] : [],
    [job11] : [],
    [job12] : [],
    [job13] : [],
    [job14] : [],
    [job15] : [],
    [job16] : [],
    [job17] : [],
  }
  const employment = {
    [employment1] : [],
    [employment2] : [],
    [employment3] : [],
  }
  return { 
    Total : total,
    Month :  month,
    Gender : gender,
    LoanSize : loanSize,
    Income : income,
    Age: age,
    Region: region,
    Marital: marital,
    Channel: channel,
    Education: education,
    Business: business,
    Job: job,
    Employment: employment
  }
}

const demographicMonth = async date => {
  const result = {}
  date.subtract(13, 'month')
  for(let count = 0 ; count < 13 ; count += 1) {
    const start = date.format("YYYY-MM-DD HH:mm:ss")
    const key = date.format('YYYY/MM')
    const end = date.add(1, 'month').format("YYYY-MM-DD HH:mm:ss")
    result[key] = await appByDate(start, end)
  }
  return result
}