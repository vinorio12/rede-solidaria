import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Pin } from '@/domain/types'
import { arteDoPin, desenharFaceProcedural } from '@/lib/pinArte'

// Visualizador 3D do pin (seção 6.10): disco metálico com a arte na face,
// fecho borboleta no verso, rotação por toque/mouse e brilho ao desbloquear.
// Se o pin tiver um modelo .glb (pin.modeloGlb), ele substitui o disco procedural.

const RAIO = 1
const ESPESSURA = 0.13

function Ambiente() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function useTexturaFace(pin: Pin, bloqueado: boolean) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (bloqueado) {
      setTex(null)
      return
    }
    let vivo = true
    let atual: THREE.Texture | null = null
    const arte = arteDoPin(pin)
    const pronto = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      atual = t
      if (vivo) setTex(t)
      else t.dispose()
    }
    if (arte) new THREE.TextureLoader().load(arte.frente, pronto)
    else desenharFaceProcedural(pin, 1024).then((c) => pronto(new THREE.CanvasTexture(c)))
    return () => {
      vivo = false
      atual?.dispose()
    }
  }, [pin, bloqueado])
  return tex
}

function Disco({ pin, bloqueado, brilho }: { pin: Pin; bloqueado: boolean; brilho: boolean }) {
  const grupo = useRef<THREE.Group>(null)
  const face = useTexturaFace(pin, bloqueado)
  const inicioBrilho = useRef<number | null>(null)
  const { gl } = useThree()
  const arrasto = useRef({ ativo: false, x: 0, y: 0, vx: 0.006, vy: 0 })
  const rot = useRef({ x: -0.15, y: -0.5 })

  useEffect(() => {
    if (brilho) inicioBrilho.current = performance.now()
  }, [brilho, pin.ano])

  // arrastar com mouse ou toque para girar; solta com inércia e volta ao giro lento
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      arrasto.current.ativo = true
      arrasto.current.x = e.clientX
      arrasto.current.y = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const a = arrasto.current
      if (!a.ativo) return
      a.vx = (e.clientX - a.x) * 0.01
      a.vy = (e.clientY - a.y) * 0.01
      rot.current.y += a.vx
      rot.current.x = THREE.MathUtils.clamp(rot.current.x + a.vy, -1.1, 1.1)
      a.x = e.clientX
      a.y = e.clientY
    }
    const up = () => (arrasto.current.ativo = false)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl])

  const materiais = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: bloqueado ? '#3d4a58' : '#d9dee4', metalness: 1, roughness: bloqueado ? 0.6 : 0.22 })
    const verso = new THREE.MeshStandardMaterial({ color: bloqueado ? '#36424f' : '#c5ccd3', metalness: 1, roughness: 0.38 })
    return { metal, verso }
  }, [bloqueado])

  const materialFace = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: face ?? undefined,
        color: bloqueado ? '#2f3b48' : '#ffffff',
        metalness: bloqueado ? 0.6 : 0.15,
        roughness: bloqueado ? 0.55 : 0.18,
        clearcoat: bloqueado ? 0 : 1, // efeito de resina/epóxi do pin
        clearcoatRoughness: 0.08,
        emissive: new THREE.Color('#00BEDF'),
        emissiveIntensity: 0,
      }),
    [face, bloqueado],
  )

  useEffect(
    () => () => {
      materiais.metal.dispose()
      materiais.verso.dispose()
      materialFace.dispose()
    },
    [materiais, materialFace],
  )

  useFrame((_, dt) => {
    const g = grupo.current
    if (!g) return
    const a = arrasto.current
    if (!a.ativo) {
      a.vx += (0.006 - a.vx) * Math.min(1, dt * 1.5)
      a.vy *= 0.9
      rot.current.y += a.vx
      rot.current.x += (-0.15 - rot.current.x) * Math.min(1, dt * 0.8)
    }
    g.rotation.set(rot.current.x, rot.current.y, 0)

    if (inicioBrilho.current !== null) {
      const t = (performance.now() - inicioBrilho.current) / 1000
      if (t > 2.2) {
        inicioBrilho.current = null
        materialFace.emissiveIntensity = 0
        g.scale.setScalar(1)
      } else {
        materialFace.emissiveIntensity = Math.sin(Math.min(t / 2.2, 1) * Math.PI) * 0.55
        g.scale.setScalar(1 + Math.sin(Math.min(t / 0.6, 1) * Math.PI) * 0.12)
        a.vx = 0.08 * (1 - t / 2.2) + 0.006
      }
    }
  })

  return (
    <group ref={grupo}>
      {/* face com a arte */}
      <mesh position={[0, 0, ESPESSURA / 2 + 0.001]} material={materialFace}>
        <circleGeometry args={[RAIO * 0.985, 128]} />
      </mesh>
      {/* aro metálico chanfrado */}
      <mesh position={[0, 0, ESPESSURA / 2 - 0.005]} material={materiais.metal}>
        <torusGeometry args={[RAIO * 0.985, 0.035, 24, 160]} />
      </mesh>
      {/* lateral */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={materiais.metal}>
        <cylinderGeometry args={[RAIO, RAIO, ESPESSURA, 160, 1, true]} />
      </mesh>
      {/* verso */}
      <mesh position={[0, 0, -ESPESSURA / 2]} rotation={[0, Math.PI, 0]} material={materiais.verso}>
        <circleGeometry args={[RAIO, 128]} />
      </mesh>
      {/* agulha e fecho borboleta */}
      <mesh position={[0, 0, -ESPESSURA / 2 - 0.12]} rotation={[Math.PI / 2, 0, 0]} material={materiais.metal}>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 16]} />
      </mesh>
      <mesh position={[0, 0, -ESPESSURA / 2 - 0.2]} material={materiais.metal}>
        <boxGeometry args={[0.42, 0.26, 0.06]} />
      </mesh>
      {[-1, 1].map((lado) => (
        <mesh key={lado} position={[lado * 0.17, 0, -ESPESSURA / 2 - 0.17]} rotation={[Math.PI / 2, 0, 0]} material={materiais.metal}>
          <cylinderGeometry args={[0.09, 0.09, 0.07, 24]} />
        </mesh>
      ))}
    </group>
  )
}

function ModeloGlb({ url }: { url: string }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null)
  const grupo = useRef<THREE.Group>(null)
  useEffect(() => {
    new GLTFLoader().load(url, (g) => setObj(g.scene))
  }, [url])
  useFrame((_, dt) => {
    if (grupo.current) grupo.current.rotation.y += dt * 0.5
  })
  return <group ref={grupo}>{obj && <primitive object={obj} />}</group>
}

export default function PinViewer3D({ pin, bloqueado, brilho = false, modeloGlb }: { pin: Pin; bloqueado: boolean; brilho?: boolean; modeloGlb?: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: 'pan-y', cursor: 'grab' }}
      aria-label={`Pin ${pin.ano} em 3D. Arraste para girar.`}
      role="img"
    >
      <Ambiente />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
      <directionalLight position={[-3, -1, 2]} intensity={0.6} color="#9BE7F5" />
      <pointLight position={[0, 0, -3]} intensity={0.8} />
      {modeloGlb ? <ModeloGlb url={modeloGlb} /> : <Disco pin={pin} bloqueado={bloqueado} brilho={brilho} />}
    </Canvas>
  )
}
