import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoUploader from '../PhotoUploader'

const mockSetFotos = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
})

function makeFile(name) {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

describe('PhotoUploader component', () => {
  it('renders add photos button', () => {
    render(<PhotoUploader fotos={[]} setFotos={mockSetFotos} />)
    expect(screen.getByText('Agregar fotos')).toBeInTheDocument()
  })

  it('shows no previews initially', () => {
    const { container } = render(<PhotoUploader fotos={[]} setFotos={mockSetFotos} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('calls setFotos when files are selected via hidden input', async () => {
    const { container } = render(<PhotoUploader fotos={[]} setFotos={mockSetFotos} />)
    const fileInput = container.querySelector('input[type="file"]')
    const file = makeFile('foto1.jpg')

    await userEvent.setup().upload(fileInput, file)

    expect(mockSetFotos).toHaveBeenCalled()
    const fn = mockSetFotos.mock.calls[0][0]
    const prev = []
    const result = fn(prev)
    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe('foto1.jpg')
  })

  it('triggers file input when button is clicked', async () => {
    const { container } = render(<PhotoUploader fotos={[]} setFotos={mockSetFotos} />)
    const fileInput = container.querySelector('input[type="file"]')
    const clickSpy = vi.spyOn(fileInput, 'click')

    await userEvent.setup().click(screen.getByText('Agregar fotos'))
    expect(clickSpy).toHaveBeenCalled()
  })
})
