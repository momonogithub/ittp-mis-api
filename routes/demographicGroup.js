import moment from 'moment'
import { appByDate } from './query'
import { groupBy } from 'lodash'
import { reConvertDecimal } from './utilize'

export const demographicGroup = async (datas, date) => {
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
  const marital5 = 'อื่นๆระบุ'

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

  //Job
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
  const total = {}
  const month = {}
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
    [marital5] : [],
  }
  const channel = groupBy(datas, 'wayCode')
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

  datas.map(data => {
    //gender
    if(data.title === 'นาย') {
      gender[gender1].push(data)
    } else if(data.title === 'นาง' || 'นางสาว') {
      gender[gender2].push(data)
    }

    //LoanSize
    const credit_limit = reConvertDecimal(data.credit_limit)
    if(credit_limit > 100000) {
      loanSize[loanSize11].push(data)
    }else if(credit_limit > 90000) {
      loanSize[loanSize10].push(data)
    }else if(credit_limit > 80000) {
      loanSize[loanSize9].push(data)
    }else if(credit_limit > 70000) {
      loanSize[loanSize8].push(data)
    }else if(credit_limit > 60000) {
      loanSize[loanSize7].push(data)
    }else if(credit_limit > 50000) {
      loanSize[loanSize6].push(data)
    }else if(credit_limit > 40000) {
      loanSize[loanSize5].push(data)
    }else if(credit_limit > 30000) {
      loanSize[loanSize4].push(data)    
    }else if(credit_limit > 20000) {
      loanSize[loanSize3].push(data)
    }else if(credit_limit > 10000) {
      loanSize[loanSize2].push(data)
    }else {
      loanSize[loanSize1].push(data)
    }
    
    //income
    const appIncome = reConvertDecimal(data.income)
    if(appIncome > 50000) {
      income[income9].push(data)
    }else if(appIncome > 40000) {
      income[income8].push(data)
    }else if(appIncome > 30000) {
      income[income7].push(data)
    }else if(appIncome > 20000) {
      income[income6].push(data)
    }else if(appIncome > 15000) {
      income[income5].push(data)
    }else if(appIncome > 12000) {
      income[income4].push(data)
    }else if(appIncome > 10000) {
      income[income3].push(data)
    }else if(appIncome > 8000) {
      income[income2].push(data)
    }else {
      income[income1].push(data)
    }

    //age
    const ageYear = date.toDate().getFullYear() - moment(data.birthdate).toDate().getFullYear()
    if(ageYear > 20 && ageYear < 25) {
      age[age1].push(data)
    }else if (ageYear > 25 && ageYear < 30) {
      age[age2].push(data)
    }else if (ageYear > 30 && ageYear < 35) {
      age[age3].push(data)
    }else if (ageYear > 35 && ageYear < 40) {
      age[age4].push(data)
    }else if (ageYear > 40 && ageYear < 45) {
      age[age5].push(data)
    }else if (ageYear > 45 && ageYear < 50) {
      age[age6].push(data)
    }else if (ageYear > 50 && ageYear < 55) {
      age[age7].push(data)
    }else if (ageYear > 55 && ageYear < 60) {
      age[age8].push(data)
    }

    //marital
    const maritalStatus = data.maritalStatus
    if(maritalStatus === marital1) {
      marital[marital1].push(data)
    } else if(maritalStatus === marital2) {
      marital[marital2].push(data)
    } else if(maritalStatus === marital3) {
      marital[marital3].push(data)
    } else if(maritalStatus === marital4) {
      marital[marital4].push(data)
    } else {
      marital[marital5].push(data)
    }

    //education
    if(data.education === education1) {
      education[education1].push(data)
    } else if(data.education === education2) {
      education[education2].push(data)
    } else if(data.education === education3) {
      education[education3].push(data)
    } else if(data.education === education4) {
      education[education4].push(data)
    }

    //business
    if(data.businessType === business1) {
      business[business1].push(data)
    } else if(data.businessType === business2) {
      business[business2].push(data)
    } else if(data.businessType === business3) {
      business[business3].push(data)
    } else if(data.businessType === business4) {
      business[business4].push(data)
    } else if(data.businessType === business5) {
      business[business5].push(data)
    } else if(data.businessType === business6) {
      business[business6].push(data)
    } else if(data.businessType === business7) {
      business[business7].push(data)
    } else if(data.businessType === business8) {
      business[business8].push(data)
    } else if(data.businessType === business9) {
      business[business9].push(data)
    } else if(data.businessType === business10) {
      business[business10].push(data)
    } else if(data.businessType === business11) {
      business[business11].push(data)
    } else if(data.businessType === business12) {
      business[business12].push(data)
    } else if(data.businessType === business13) {
      business[business13].push(data)
    } else if(data.businessType === business14) {
      business[business14].push(data)
    }

    if(data.occupation === job1) {
      job[job1].push(data)
    } else if(data.occupation === job2) {
      job[job2].push(data)
    } else if(data.occupation === job3) {
      job[job3].push(data)
    } else if(data.occupation === job4) {
      job[job4].push(data)
    } else if(data.occupation === job5) {
      job[job5].push(data)
    } else if(data.occupation === job6) {
      job[job6].push(data)
    } else if(data.occupation === job7) {
      job[job7].push(data)
    } else if(data.occupation === job8) {
      job[job8].push(data)
    } else if(data.occupation === job9) {
      job[job9].push(data)
    } else if(data.occupation === job10) {
      job[job10].push(data)
    } else if(data.occupation === job11) {
      job[job11].push(data)
    } else if(data.occupation === job12) {
      job[job12].push(data)
    } else if(data.occupation === job13) {
      job[job13].push(data)
    } else if(data.occupation === job14) {
      job[job14].push(data)
    } else if(data.occupation === job15) {
      job[job15].push(data)
    } else if(data.occupation === job16) {
      job[job16].push(data)
    } else if(data.occupation === job17) {
      job[job17].push(data)
    }

    if(data.employment === employment1) {
      employment[employment1].push(data)
    } else if(data.occupation === employment2) {
      employment[employment2].push(data)
    } else if(data.occupation === employment3) {
      employment[employment3].push(data)
    } 
    
    return data
  })

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