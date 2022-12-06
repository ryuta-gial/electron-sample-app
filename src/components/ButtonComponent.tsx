import React from 'react'
import styles from 'styles/Button.module.css'
type InputProps = JSX.IntrinsicElements['button']
type Props = InputProps & { btnText: string; btnClose?: boolean;className?: string;}

const ButtonComponent: React.VFC<Props> = ({
    btnText,
    btnClose,
    className,
    ...inputProps
}) => {
    return (
        <button
            className={`${styles.btn} ${className ?className : ""}`}
            {...inputProps}
        >
            <span>{btnText ? btnText : '@'}</span>
        </button>
    )
}

export default ButtonComponent
