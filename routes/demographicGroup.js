import moment from 'moment'
import { appByDate } from './query'
import { groupBy } from 'lodash'
import { reConvertDecimal } from './utilize'
import checkRegion  from './province'

export const demographicGroup = async (datas, date) => {
  //Gender
  const gender1 = 'Male'
  const gender2 = 'Female'

  //Loan Size
  const loanSize1 = '< 10000'
  const loanSize2 = '10001 - 20000'
  const loanSize3 = '20001 - 30000'
  const loanSize4 = '30001 - 40000'
  const loanSize5 = '40001 - 50000'
  const loanSize6 = '50001 - 60000'
  const loanSize7 = '60001 - 70000'
  const loanSize8 = '70001 - 80000'
  const loanSize9 = '80001 - 90000'
  const loanSize10 = '90001 - 100000'
  const loanSize11 = '> 100000'
  
  //Income
  const income1 = '< 8000'
  const income2 = '8001 - 10000'
  const income3 = '10001 - 12000'
  const income4 = '12001 - 15000'
  const income5 = '15001 - 20000'
  const income6 = '20001 - 30000'
  const income7 = '30001 - 40000'
  const income8 = '40001 - 50000'
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

  const marital = groupBy(datas, 'maritalStatus')
  delete marital['null'] 
  delete marital['undefined']

  const channel = groupBy(datas, 'wayCode')
  delete channel['null'] 
  delete channel['undefined']

  const education = groupBy(datas, 'education')
  delete education['null'] 
  delete education['undefined']

  const business = groupBy(datas, 'businessType')
  delete business['null'] 
  delete business['undefined']

  const job = groupBy(datas, 'occupation')
  delete job['null'] 
  delete job['undefined']
  
  const employment = groupBy(datas, 'employmentStatus')
  delete employment['null'] 
  delete employment['undefined']

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

    //region
    const officeRegion = checkRegion(data.officeProvince)
    if(officeRegion === region1) {
      region[region1].push(data)
    } else if(officeRegion === region2) {
      region[region2].push(data)
    } else if(officeRegion === region3) {
      region[region3].push(data)
    } else if(officeRegion === region4) {
      region[region4].push(data)
    } else if(officeRegion === region5) {
      region[region5].push(data)
    } else if(officeRegion === region6) {
      region[region6].push(data)
    } else if(officeRegion === region7) {
      region[region7].push(data)
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