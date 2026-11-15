import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

import { Spinner } from './Spinner'
import { buttonStyles } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      type = 'button',
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[buttonStyles({ variant, size, fullWidth }), className]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled === true || isLoading}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? <Spinner className="h-4 w-4" /> : null}
        {children}
      </button>
    )
  },
)
