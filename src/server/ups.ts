/**
 * Rewrite of https://www.waveshare.com/wiki/UPS_HAT python script
 */
import i2c, {I2CBus} from 'i2c-bus'

// Config Register (R/W)
const _REG_CONFIG = 0x00
// SHUNT VOLTAGE REGISTER (R)
const _REG_SHUNTVOLTAGE = 0x01

// BUS VOLTAGE REGISTER (R)
const _REG_BUSVOLTAGE = 0x02

// POWER REGISTER (R)
const _REG_POWER = 0x03

// CURRENT REGISTER (R)
const _REG_CURRENT = 0x04

// CALIBRATION REGISTER (R/W)
const _REG_CALIBRATION = 0x05

const BusVoltageRange = {
  RANGE_16V: 0x00, // set bus voltage range to 16V
  RANGE_32V: 0x01, // set bus voltage range to 32V (default)
} as const

const Gain = {
  DIV_1_40MV: 0x00, // shunt prog. gain set to  1, 40 mV range
  DIV_2_80MV: 0x01, // shunt prog. gain set to  2, 80 mV range
  DIV_4_160MV: 0x02, // shunt prog. gain set to  4, 160 mV range
  DIV_8_320MV: 0x03, // shunt prog. gain set to  8, 320 mV range
} as const

const ADCResolution = {
  ADCRES_9BIT_1S: 0x00, //  9bit,    1 sample,     84us
  ADCRES_10BIT_1S: 0x01, // 10bit,   1 sample,    148us
  ADCRES_11BIT_1S: 0x02, // 11bit,   1 sample,    276us
  ADCRES_12BIT_1S: 0x03, // 12bit,   1 sample,    532us
  ADCRES_12BIT_2S: 0x09, // 12bit,   2 samples,  1.06ms
  ADCRES_12BIT_4S: 0x0a, // 12bit,   4 samples,  2.13ms
  ADCRES_12BIT_8S: 0x0b, // 12bit,   8 samples,  4.26ms
  ADCRES_12BIT_16S: 0x0c, // 12bit,  16 samples,  8.51ms
  ADCRES_12BIT_32S: 0x0d, // 12bit,  32 samples, 17.02ms
  ADCRES_12BIT_64S: 0x0e, // 12bit,  64 samples, 34.05ms
  ADCRES_12BIT_128S: 0x0f, // 12bit, 128 samples, 68.10ms
} as const

const Mode = {
  POWERDOWN: 0x00, // power down
  SVOLT_TRIGGERED: 0x01, // shunt voltage triggered
  BVOLT_TRIGGERED: 0x02, // bus voltage triggered
  SANDBVOLT_TRIGGERED: 0x03, // shunt and bus voltage triggered
  ADCOFF: 0x04, // ADC off
  SVOLT_CONTINUOUS: 0x05, // shunt voltage continuous
  BVOLT_CONTINUOUS: 0x06, // bus voltage continuous
  SANDBVOLT_CONTINUOUS: 0x07, // shunt and bus voltage continuous
} as const

export class INA219 {
  private calValue: number
  private currentLsb: number
  private powerLsb: number
  private busVoltageRange: number
  private gain: number
  private busADCresolution: number
  private shuntADCresolution: number
  private mode: number
  private config: Set<number>

  public bus: I2CBus
  public address: number

  public constructor(i2cBus = 1, address = 0x40) {
    this.bus = i2c.openSync(i2cBus)
    this.address = address
    this.calValue = 0
    this.currentLsb = 0
    this.powerLsb = 0
    this.setCalibration32V2A()
  }

  private read(address: number): number {
    const buffer = Buffer.alloc(2)
    this.bus.readI2cBlockSync(this.address, address, 2, buffer)

    return buffer.at(0) * 256 + buffer.at(1)
  }

  private write(address: number, data: any): void {
    const temp = [0, 0]
    temp[1] = data && 0xff
    temp[0] = (data && 0xff00) >> 8

    this.bus.writeI2cBlockSync(
      this.address,
      address,
      temp.length,
      Buffer.from(temp)
    )
  }

  /**
   * Configures to INA219 to be able to measure up to 32V and 2A of current. Counter
   * overflow occurs at 3.2A.
   * @note These calculations assume a 0.1 shunt ohm resistor is present
   */
  private setCalibration32V2A() {
    // By default we use a pretty huge range for the input voltage,
    // which probably isn't the most appropriate choice for system
    // that don't use a lot of power.  But all of the calculations
    // are shown below if you want to change the settings.  You will
    // also need to change any relevant register settings, such as
    // setting the VBUS_MAX to 16V instead of 32V, etc.

    // VBUS_MAX = 32V             (Assumes 32V, can also be set to 16V)
    // VSHUNT_MAX = 0.32          (Assumes Gain 8, 320mV, can also be 0.16, 0.08, 0.04)
    // RSHUNT = 0.1               (Resistor value in ohms)

    // 1. Determine max possible current
    // MaxPossible_I = VSHUNT_MAX / RSHUNT
    // MaxPossible_I = 3.2A

    // 2. Determine max expected current
    // MaxExpected_I = 2.0A

    // 3. Calculate possible range of LSBs (Min = 15-bit, Max = 12-bit)
    // MinimumLSB = MaxExpected_I/32767
    // MinimumLSB = 0.000061              (61uA per bit)
    // MaximumLSB = MaxExpected_I/4096
    // MaximumLSB = 0,000488              (488uA per bit)

    // 4. Choose an LSB between the min and max values
    //    (Preferrably a roundish number close to MinLSB)
    // CurrentLSB = 0.0001 (100uA per bit)

    this.currentLsb = 1 // Current LSB = 100uA per bit

    // 5. Compute the calibration register
    // Cal = trunc (0.04096 / (Current_LSB * RSHUNT))
    // Cal = 4096 (0x1000)

    this.calValue = 4096 // Cal = 4096 (0x1000)

    // 6. Calculate the power LSB
    // PowerLSB = 20 * CurrentLSB
    // PowerLSB = 0.002 (2mW per bit)

    this.powerLsb = 0.002 // Power LSB = 2mW per bit (0.002)

    // 7. Compute the maximum current and shunt voltage values before overflow
    //
    // Max_Current = Current_LSB * 32767
    // Max_Current = 3.2767A before overflow
    //
    // If Max_Current > Max_Possible_I then
    //    Max_Current_Before_Overflow = MaxPossible_I
    // Else
    //    Max_Current_Before_Overflow = Max_Current
    // End If
    //
    // Max_ShuntVoltage = Max_Current_Before_Overflow * RSHUNT
    // Max_ShuntVoltage = 0.32V
    //
    // If Max_ShuntVoltage >= VSHUNT_MAX
    //    Max_ShuntVoltage_Before_Overflow = VSHUNT_MAX
    // Else
    //    Max_ShuntVoltage_Before_Overflow = Max_ShuntVoltage
    // End If

    // 8. Compute the Maximum Power
    // MaximumPower = Max_Current_Before_Overflow * VBUS_MAX
    // MaximumPower = 3.2 * 32V
    // MaximumPower = 102.4W

    // Set Calibration register to 'Cal' calculated above
    this.write(_REG_CALIBRATION, this.calValue)

    // Set Config register to take into account the settings above
    this.busVoltageRange = BusVoltageRange.RANGE_32V
    this.gain = Gain.DIV_8_320MV
    this.busADCresolution = ADCResolution.ADCRES_12BIT_32S
    this.shuntADCresolution = ADCResolution.ADCRES_12BIT_32S
    this.mode = Mode.SANDBVOLT_CONTINUOUS
    this.config = new Set([
      this.busVoltageRange << 13,
      this.gain << 11,
      this.busADCresolution << 7,
      this.shuntADCresolution << 3,
      this.mode,
    ])
    this.write(_REG_CONFIG, this.config)
  }

  public getShuntVoltage_mV(): number {
    this.write(_REG_CALIBRATION, this.calValue)
    const value = this.read(_REG_SHUNTVOLTAGE)
    if (value > 32767) {
      return (value - 65535) * 0.01
    }
    return value * 0.01
  }

  public getBusVoltage_V(): number {
    this.write(_REG_CALIBRATION, this.calValue)
    this.read(_REG_BUSVOLTAGE)
    return (this.read(_REG_BUSVOLTAGE) >> 3) * 0.004
  }

  public getCurrent_mA(): number {
    const value = this.read(_REG_CURRENT)
    if (value > 32767) {
      return (value - 65535) * this.currentLsb
    }
    return value * this.currentLsb
  }

  public getPower_W(): number {
    this.write(_REG_CALIBRATION, this.calValue)
    const value = this.read(_REG_POWER)
    if (value > 32767) {
      return (value - 65535) * this.powerLsb
    }
    return value * this.powerLsb
  }

  public getState(): UPSstate {
    const busVoltage = this.getBusVoltage_V() // voltage on V- (load side)
    const shuntVoltage = this.getShuntVoltage_mV() / 1000 // voltage between V+ and V- across the shunt
    const current = this.getCurrent_mA() // current in mA
    const power = this.getPower_W() // power in Watts

    let percent = ((busVoltage - 3) / 1.2) * 100
    if (percent > 100) percent = 100
    if (percent < 0) percent = 0
    // INA219 measure bus voltage on the load side. So PSU voltage = bus_voltage + shunt_voltage
    // psuVoltage = busVoltage + shuntVoltage
    return {
      loadVoltage: busVoltage,
      psuVoltage: busVoltage + shuntVoltage,
      shuntVoltage,
      current,
      power,
      percent,
    }
  }
}

type UPSstate = {
  loadVoltage: number // V
  shuntVoltage: number // V
  psuVoltage: number // V
  current: number // A
  power: number // W
  percent: number // %
}

let ina219: INA219

export const getUPSstate = (): UPSstate => {
  if (!ina219) {
    ina219 = new INA219(1, 0x43)
  }

  return ina219.getState()
}
