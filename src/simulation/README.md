# Particle Physics Simulation with Gravitational and Electromagnetic Forces

This simulation demonstrates a simplified physics model using two fundamental forces:

1. **Gravitational Force (G)**: Attraction based on mass
2. **Electromagnetic Force (EM)**: Attraction/repulsion based on charge and spin

## Physics Model

### Gravitational Force

- Omnidirectional force that only attracts
- Based on particle mass
- Follows inverse square law (decays with square of distance)
- Follows Newton's law of universal gravitation: F = G * (m1 * m2) / r²

### Electromagnetic Force

#### Electric Component
- Unipolar force that can attract or repel
- Based on particle charge and axial spin
- Acts perpendicular to the spin axis of the particle
- Follows Coulomb's law: F = k * q1 * q2 / r²

#### Magnetic Component
- Bipolar force (attracts on one side, repels on the other)
- Aligned with the axis of spin
- Creates a magnetic field around the particle

## Particle Properties

Each particle in the simulation has:

- **Position**: 3D coordinates in space
- **Momentum**: Vector representing direction and speed
- **Mass**: Affects gravitational attraction
- **Charge**: Positive or negative value affecting electric force
- **Spin Axis**: Direction of spin (normalized vector)
- **Spin Magnitude**: Strength of spin affecting electric force
- **Magnetic Strength**: Strength of the magnetic component

## Force Tables

Each particle maintains a force table that tracks:
- Gravitational force from every other particle
- Electromagnetic force from every other particle
- Combined total force from each particle

Based on this table, the particle's momentum and spin are updated at each time step.

## Interaction

- **Left Click** on a particle to create an explosion effect
- **Mouse Drag** to rotate the view
- **Mouse Wheel** to adjust focal depth

## Credits

This simulation was built using Vue.js and vanilla JavaScript.
