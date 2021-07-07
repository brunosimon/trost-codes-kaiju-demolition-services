import './style.css'
import * as THREE from 'three'
import * as OIMO from 'oimo'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 1
scene.add(camera)

// Controls
const orbitControls = new OrbitControls(camera, canvas)
orbitControls.enableDamping = true

/**
 * Floor
 */
const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
)
floorMesh.receiveShadow = true
floorMesh.rotation.x = - Math.PI * 0.5
scene.add(floorMesh)

/**
 * Cube
 */
const cube = new THREE.Mesh(
    new THREE.BoxBufferGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
)
cube.position.y = 0.25
scene.add(cube)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight()
directionalLight.intensity = 5
directionalLight.color = new THREE.Color(0xffccaa)
directionalLight.shadow.bias = 0.00004
directionalLight.shadow.mapSize.set(2048, 2048)
directionalLight.shadow.camera.top = 10
directionalLight.shadow.camera.right = 10
directionalLight.shadow.camera.bottom = - 10
directionalLight.shadow.camera.left = - 10
directionalLight.castShadow = true
directionalLight.position.set(- 15, 10, 5)
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight()
ambientLight.intensity = 0.2
scene.add(ambientLight)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 3
renderer.physicallyCorrectLights = true
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime
    
    // Update orbit controls
    orbitControls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()