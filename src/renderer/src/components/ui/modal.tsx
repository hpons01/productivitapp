import { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed top-1/2 left-1/2 z-50 w-full p-6 rounded-2xl',
                  'bg-surface-700 border border-surface-500/50 shadow-2xl',
                  sizes[size]
                )}
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
              >
                {title && (
                  <div className="flex items-center justify-between mb-5">
                    <Dialog.Title className="text-lg font-bold text-[color:var(--app-interactive-fg-default)]">
                      {title}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="p-1.5 rounded-lg ui-icon-default ui-icon-hover ui-bg-hover transition-colors">
                        <X size={16} />
                      </button>
                    </Dialog.Close>
                  </div>
                )}
                <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
