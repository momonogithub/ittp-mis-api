import moment from 'moment'
import { reConvertDecimal } from './utilize'

export const propsNumber = [
  'cf_principal', 'cf_interest', 'cf_fee', 'min_paid',
  
]

export const propsBucket = [
  'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'
]

export const propsOSB = [
  'loan_id',
  'trans_date',
  'trc',
  ...propsNumber,
  ...propsBucket,
]
