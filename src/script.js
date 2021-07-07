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
 * Gameplay
 */
let ready = false
const $overlay = document.querySelector('.overlay')
const $kaijus = document.querySelectorAll('.kaiju')

for(const _$kaiju of $kaijus)
{
    _$kaiju.addEventListener('click', () =>
    {
        $overlay.classList.add('hidden')
        loadKaiju(_$kaiju.dataset.name)
    })
}

/**
 * Object
 */
const buildings = []

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

// // Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

/**
 * Physics world
 */
const world = new OIMO.World({ 
    // timestep: 1 / 60, 
    // iterations: 8, 
    // broadphase: 2, // 1 brute force, 2 sweep and prune, 3 volume tree
    // worldscale: 1, // scale full world 
    // random: true,  // randomize sample
    // info: false,   // calculate statistic or not
    // gravity: [0, - 9.8, 0] 
})

/**
 * Sky
 */
const sky = new Sky()
sky.material.uniforms.turbidity.value = 10
sky.material.uniforms.rayleigh.value = 3
sky.material.uniforms.mieCoefficient.value = 0.005
sky.material.uniforms.mieDirectionalG.value = 0.7

const phi = THREE.MathUtils.degToRad(90 - 2)
const theta = THREE.MathUtils.degToRad(- 70)

const spherical = new THREE.Spherical(1, phi, theta)
const sunPosition = new THREE.Vector3()
sunPosition.setFromSpherical(spherical)

sky.material.uniforms.sunPosition.value = sunPosition
sky.scale.setScalar(450000)
scene.add(sky)

/**
 * City
 */
const buildingGeometry = new THREE.BoxGeometry(1, 1, 1)
const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
const buildingCollapsedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
const citySize = 20
const cityLines = 40
const cityInterbuilding = citySize / cityLines
const cityMaxDistance = Math.hypot(citySize * 0.5, citySize * 0.5)

const createBuildings = () =>
{
    for(let i = 0; i < cityLines; i++)
    {
        for(let j = 0; j < cityLines; j++)
        {
            const building = {}
            building.collapsed = false

            // Info
            const width = (0.5 + 0.5 * Math.random()) * 0.4
            const depth = (0.5 + 0.5 * Math.random()) * 0.4

            const xRandomness = Math.random() * cityInterbuilding * 0.3
            const zRandomness = Math.random() * cityInterbuilding * 0.3

            building.x = i / cityLines * citySize - citySize * 0.5 + xRandomness
            building.z = j / cityLines * citySize - citySize * 0.5 + zRandomness
            
            const distanceToCenter = Math.hypot(building.x, building.z)
            const distanceRatio = distanceToCenter / cityMaxDistance * 1.5
            
            const height = Math.random() * (1 - distanceRatio) * 2
            building.y = height * 0.5
            const build = distanceRatio > (1 - Math.pow(1 - Math.random(), 3))

            if(!build)
            {
                // Body
                building.body = world.add({ 
                    type: 'box',
                    size: [width, height, depth], // size of shape
                    pos: [building.x, building.y, building.z],
                    rot: [0, 0, 0],
                    move: true,
                    density: 1,
                    friction: 1,
                    restitution: 1.25
                })

                // Mesh
                building.mesh = new THREE.Mesh(buildingGeometry, buildingMaterial)
                building.mesh.scale.set(width, height, depth)
                building.mesh.receiveShadow = true
                building.mesh.castShadow = true
                scene.add(building.mesh)

                // Save
                buildings.push(building)
            }
        }
    }
}

createBuildings()

/**
 * Floor
 */
const floorBody = world.add({
    size: [citySize * 2, 1, citySize * 2],
    pos: [0, - 0.5, 0],
    density: 1
})
const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(citySize * 2, 40),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
)
floorMesh.receiveShadow = true
floorMesh.rotation.x = - Math.PI * 0.5
scene.add(floorMesh)

/**
 * Kaiju
 */
const kaijuGroup = new THREE.Group()
scene.add(kaijuGroup)

let kaijuMixer = null
let kaijuAction = null
let kaijuRotation = - 1
let kaijuSpeed = 0

const kaijuBody = world.add({ 
    type: 'box',
    size: [0.8, 0.8, 0.8], // size of shape
    pos: [citySize * 0.5, 0.4, 0],
    rot: [0, 0, 0],
    move: true,
    density: 20,
    friction: 0.4,
    restitution: 1.25
})

const loadKaiju = (_name) =>
{
    gltfLoader.load(
        `./${_name}/scene.gltf`,
        (_gltf) =>
        {
            const scale = _name === 'godzilla' ? 0.0015 : 0.5
            _gltf.scene.scale.set(scale, scale, scale)
            _gltf.scene.position.y = - 0.4
            _gltf.scene.traverse((_child) =>
            {
                if(_child instanceof THREE.Mesh)
                {
                    _child.castShadow = true
                }
            })
            kaijuGroup.add(_gltf.scene)
    
            // Animation
            kaijuMixer = new THREE.AnimationMixer(_gltf.scene)
            kaijuAction = kaijuMixer.clipAction(_gltf.animations[0])
            // kaijuAction.weight = 0
            kaijuAction.timeScale = 1.5
    
            kaijuAction.play()

            ready = true
        }
    )
}

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
 * Controls
 */
const keysDown = {
    up: false,
    right: false,
    down: false,
    left: false
}

window.addEventListener('keydown', (_event) =>
{
    switch(_event.code)
    {
        case 'ArrowUp':
        case 'KeyW':
            keysDown.up = true
            break
        case 'ArrowRight':
        case 'KeyD':
            keysDown.right = true
            break
        case 'ArrowDown':
        case 'KeyS':
            keysDown.down = true
            break
        case 'ArrowLeft':
        case 'KeyA':
            keysDown.left = true
            break
    }
})

window.addEventListener('keyup', (_event) =>
{
    switch(_event.code)
    {
        case 'ArrowUp':
        case 'KeyW':
            keysDown.up = false
            break
        case 'ArrowRight':
        case 'KeyD':
            keysDown.right = false
            break
        case 'ArrowDown':
        case 'KeyS':
            keysDown.down = false
            break
        case 'ArrowLeft':
        case 'KeyA':
            keysDown.left = false
            break
    }
})

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

    // Kaiju Controls
    if(ready)
    {
        if(keysDown.right)
        {
            kaijuRotation -= 1 * deltaTime
        }
        if(keysDown.left)
        {
            kaijuRotation += 1 * deltaTime
        }
        if(keysDown.up && kaijuSpeed < 1)
        {
            const x = Math.sin(kaijuRotation) * 2
            const z = Math.cos(kaijuRotation) * 2
            const force = new OIMO.Vec3(x, 0, z)
            kaijuBody.applyImpulse(kaijuBody.position, force)
        }
    }

    // World
    world.step()

    // Update scene according to world
    for(const _building of buildings)
    {
        _building.mesh.position.copy(_building.body.position)
        _building.mesh.quaternion.copy(_building.body.quaternion)

        if(!_building.collapsed)
        {
            const distanceToOrigin = Math.hypot(_building.x - _building.body.position.x, _building.z - _building.body.position.z)

            if(distanceToOrigin > cityInterbuilding * 0.1)
            {
                _building.collapsed = true
                _building.mesh.material = buildingCollapsedMaterial
            }
        }
    }

    // // Update controls
    // controls.update()

    // Update kaiju
    kaijuSpeed = kaijuGroup.position.distanceTo(kaijuBody.position) / deltaTime
    kaijuGroup.position.copy(kaijuBody.position)
    kaijuGroup.rotation.y = kaijuRotation

    if(kaijuMixer)
    {
        kaijuAction.setEffectiveWeight(kaijuSpeed)
        // console.log(kaijuAction.weight)
        kaijuMixer.update(deltaTime)
    }

    // Update camera
    const kaijuAngle = Math.atan2(kaijuGroup.position.z, kaijuGroup.position.x)
    const kaijuDistanceToCenter = Math.hypot(kaijuGroup.position.z, kaijuGroup.position.x)
    const kaijuDistanceToCenterRatio = (1 - kaijuDistanceToCenter / (citySize * 0.5))
    const cameraRadius = kaijuDistanceToCenter + 2
    const cameraY = 0.2 + kaijuDistanceToCenterRatio * 1.5
    const cameraX = Math.cos(kaijuAngle) * cameraRadius
    const cameraZ = Math.sin(kaijuAngle) * cameraRadius

    camera.position.x += (cameraX - camera.position.x) * 4 * deltaTime
    camera.position.y += (cameraY - camera.position.y) * 4 * deltaTime
    camera.position.z += (cameraZ - camera.position.z) * 4 * deltaTime

    camera.lookAt(scene.position)

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()