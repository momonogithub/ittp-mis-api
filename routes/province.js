const checkRegion = province => {
  switch (province) {
    case 'กรุงเทพมหานคร' :
      return 'BKK'
    case 'สมุทรปราการ' :
    case 'นนทบุรี' :
    case 'ปทุมธานี' :
    case 'พระนครศรีอยุธยา' :
    case 'อ่างทอง' :
    case 'ลพบุรี' :
    case 'สิงห์บุรี' :
    case 'ชัยนาท' :
    case 'สระบุรี' :
    case 'นครนายก' :
    case 'นครสวรรค์' :
    case 'อุทัยธานี' :
    case 'กำแพงเพชร' :
    case 'สุโขทัย' :
    case 'พิษณุโลก' :
    case 'พิจิตร' :
    case 'เพชรบูรณ์' :
    case 'สุพรรณบุรี' :
    case 'นครปฐม' :
    case 'สมุทรสาคร' :
    case 'สมุทรสงคราม' :
      return 'Central'
    case 'ชลบุรี' :
    case 'ระยอง' :
    case 'จันทบุรี' :
    case 'ตราด' :
    case 'ฉะเชิงเทรา' :
    case 'ปราจีนบุรี' :
    case 'สระแก้ว' :
      return 'East'
    case 'นครราชสีมา' :
    case 'บุรีรัมย์' :
    case 'สุรินทร์' :
    case 'ศรีสะเกษ' :
    case 'อุบลราชธานี' :
    case 'ยโสธร' :
    case 'ชัยภูมิ' :
    case 'อำนาจเจริญ' :
    case 'หนองบัวลำภู' :
    case 'ขอนแก่น' :
    case 'อุดรธานี' :
    case 'เลย' :
    case 'หนองคาย' :
    case 'มหาสารคาม' :
    case 'ร้อยเอ็ด' :
    case 'กาฬสินธุ์' :
    case 'สกลนคร' :
    case 'นครพนม' :
    case 'มุกดาหาร' :
    case 'บึงกาฬ' :
      return 'Northeast'
    case 'กระบี่' :
    case 'พังงา' :
    case 'ภูเก็ต' :
    case 'สุราษฎร์ธานี' :
    case 'ระนอง' :
    case 'ชุมพร' :
    case 'สงขลา' :
    case 'สตูล' :
    case 'ตรัง' :
    case 'พัทลุง' :
    case 'ปัตตานี' :
    case 'ยะลา' :
    case 'นราธิวาส' :
    case 'นครศรีธรรมราช' :
      return 'South'
    case 'เชียงใหม่' :
    case 'ลำพูน' :
    case 'ลำปาง' :
    case 'อุตรดิตถ์' :
    case 'แพร่' :
    case 'น่าน' :
    case 'พะเยา' :
    case 'เชียงราย' :
    case 'แม่ฮ่องสอน' :
      return 'North'
    case 'ตาก' :
    case 'ราชบุรี' :
    case 'กาญจนบุรี' :
    case 'เพชรบุรี' :
    case 'ประจวบคีรีขันธ์' :
      return 'West'
    default :
      return province
  }
}

export default checkRegion