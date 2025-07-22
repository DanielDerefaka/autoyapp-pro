/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple component test example
const MockDashboard = () => {
  return (
    <div data-testid="dashboard">
      <h1>AutoYapp Pro Dashboard</h1>
      <div data-testid="metrics">
        <span>Targets: 5</span>
        <span>Replies: 12</span>
      </div>
    </div>
  )
}

describe('Dashboard Component', () => {
  it('should render dashboard with metrics', () => {
    render(<MockDashboard />)
    
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /autoyapp pro dashboard/i })).toBeInTheDocument()
    expect(screen.getByTestId('metrics')).toBeInTheDocument()
    expect(screen.getByText('Targets: 5')).toBeInTheDocument()
    expect(screen.getByText('Replies: 12')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<MockDashboard />)
    
    const dashboard = screen.getByTestId('dashboard')
    expect(dashboard).toBeInTheDocument()
    
    const heading = screen.getByRole('heading')
    expect(heading).toHaveTextContent('AutoYapp Pro Dashboard')
  })
})