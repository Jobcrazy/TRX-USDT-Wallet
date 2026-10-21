let otpauthUrl = null

export const getPending2FA = () => otpauthUrl
export const setPending2FA = (value) => {
  otpauthUrl = value || null
}
