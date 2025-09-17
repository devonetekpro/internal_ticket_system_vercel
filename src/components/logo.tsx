import type { SVGProps } from 'react'

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16 2.66663C8.64 2.66663 2.66669 8.63996 2.66669 16C2.66669 23.36 8.64 29.3333 16 29.3333C18.232 29.3333 20.352 28.84 22.256 27.9733L26.512 29.12C26.856 29.2133 27.2134 29.04 27.3867 28.7333C27.56 28.4266 27.5334 28.0533 27.32 27.76L24.8 24.5333C27.744 21.9866 29.3334 18.5733 29.3334 16C29.3334 8.63996 23.36 2.66663 16 2.66663Z"
        fill="currentColor"
      />
    </svg>
  )
}
