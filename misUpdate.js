import moment from 'moment'
import { startDate } from './setting'
import { updateChannel } from './routes/channel'
import { updateDemographic } from './routes/demographic'
import { updatePortSummary } from './routes/portSummary'
import { updatePortTotal } from './routes/portTotal'
import { updateNetflow } from './routes/netflow'

export const autoUpdate = () => {
  console.log('LUL')
}

export const updateAll = async () => {
  const start = moment(startDate)
  const now = new Date()
  let month = start.month()
  let year = start.year()
  const currMonth = now.getMonth()
  const currYear = now.getFullYear()
  console.log('---------- Auto Update ----------')
  console.time('Update')
  while(year !== currYear || month !== currMonth) {
    const date = moment(`${year}${month+1}`, 'YYYYM')
    await Promise.all([
      updateChannel(date.clone()).then(() => console.log('clear 1')),
      // updateDemographic(date.clone()).then(() => console.log('clear 2')),
      // updateNetflow(date.clone()).then(() => console.log('clear 3')),
      // updatePortSummary(date.clone()).then(() => console.log('clear 4')),
      // updatePortTotal(date.clone()).then(() => console.log('clear 5')),
    ])
    console.log(`Update Data at ${month+1}/${year} successful`)
    month += 1
    if(month > 11) {
      year += 1
      month = 0
    }
  }
  console.timeEnd('Update')
}