import { TextField } from '../../components/ui'

export interface NewPasswordFieldsProps {
  idPrefix: string
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  passwordError?: string
  confirmPasswordError?: string
  passwordLabel?: string
  hint?: string
}

/**
 * The two password inputs shared by registration, reset, and change forms.
 * Policy wording comes from the server-mirroring helper, not from this
 * component, so every form reports the same rules.
 */
export function NewPasswordFields({
  idPrefix,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  passwordError,
  confirmPasswordError,
  passwordLabel = 'New password',
  hint,
}: NewPasswordFieldsProps) {
  return (
    <>
      <TextField
        id={`${idPrefix}-password`}
        name="new-password"
        type="password"
        label={passwordLabel}
        autoComplete="new-password"
        value={password}
        error={passwordError}
        hint={hint}
        onChange={(event) => {
          onPasswordChange(event.target.value)
        }}
      />

      <TextField
        id={`${idPrefix}-confirm-password`}
        name="confirm-password"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        error={confirmPasswordError}
        onChange={(event) => {
          onConfirmPasswordChange(event.target.value)
        }}
      />
    </>
  )
}
