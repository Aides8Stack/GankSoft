/*
 * List NodeView lifecycle adapted from Milkdown 7.22.3; public ListItem UI reused:
 * https://github.com/Milkdown/milkdown/blob/v7.22.3/packages/components/src/list-item-block/view.ts
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020-present Mirone
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { Editor } from "@milkdown/kit/core";
import type { Node } from "@milkdown/kit/prose/model";
import type { EditorView, NodeViewConstructor } from "@milkdown/kit/prose/view";
import { listItemSchema } from "@milkdown/kit/preset/commonmark";
import { $view } from "@milkdown/kit/utils";
import { ListItem, listItemBlockConfig, listItemBlockView } from "@milkdown/kit/component/list-item-block";
import { createApp, ref, watchEffect } from "vue";
import { createListSelectionRestore } from "./list-selection-restore";

const pending = new WeakMap<EditorView, { restores: ReturnType<typeof createListSelectionRestore>; owners: number }>();
function acquire(view: EditorView) {
  let entry = pending.get(view);
  if (!entry) {
    entry = { restores: createListSelectionRestore(view), owners: 0 };
    pending.set(view, entry);
  }
  entry.owners++;
  return entry.restores;
}
function release(view: EditorView) {
  const entry = pending.get(view);
  if (entry && --entry.owners === 0) {
    entry.restores.dispose();
    pending.delete(view);
  }
}

const guardedListItemView = $view(
  listItemSchema.node,
  (ctx): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      const restores = acquire(view)
      let alive = true
      const dom = document.createElement('div')
      dom.className = 'milkdown-list-item-block'

      const contentDOM = document.createElement('div')
      contentDOM.setAttribute('data-content-dom', 'true')
      contentDOM.classList.add('content-dom')

      const label = ref(initialNode.attrs.label)
      const checked = ref(initialNode.attrs.checked)
      const listType = ref(initialNode.attrs.listType)
      const readonly = ref(!view.editable)
      const config = ctx.get(listItemBlockConfig.key)
      const selected = ref(false)
      const setAttr = (attr: string, value: unknown) => {
        if (!view.editable) return
        const pos = getPos()
        if (pos == null) return

        if (!view.hasFocus()) view.focus()

        view.dispatch(view.state.tr.setNodeAttribute(pos, attr, value))
      }
      const disposeSelectedWatcher = watchEffect(() => {
        const isSelected = selected.value
        if (isSelected) {
          dom.classList.add('selected')
        } else {
          dom.classList.remove('selected')
        }
      })
      let mountedDiv: HTMLElement | null = null
      const onMount = (div: HTMLElement) => {
        // Vue invokes function refs on every patch, not only on mount.
        // Re-running this would dispatch a text selection over whatever is
        // currently selected, clobbering the node selection created by the
        // block handle.
        if (div === mountedDiv) return
        mountedDiv = div

        div.appendChild(contentDOM)
        // put the cursor to the new created list item
        restores.schedule(dom, () => {
          if (!alive || !dom.isConnected || !view.dom.contains(dom)) return false
          const pos = getPos()
          return pos != null && view.state.doc.nodeAt(pos)?.type === initialNode.type
        })
      }

      const app = createApp(ListItem, {
        label,
        checked,
        listType,
        readonly,
        config,
        selected,
        setAttr,
        onMount,
      })
      app.mount(dom)
      const bindAttrs = (node: Node) => {
        listType.value = node.attrs.listType
        label.value = node.attrs.label
        checked.value = node.attrs.checked
        readonly.value = !view.editable
      }

      bindAttrs(initialNode)
      let node = initialNode
      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type !== initialNode.type) return false

          if (
            updatedNode.sameMarkup(node) &&
            updatedNode.content.eq(node.content)
          )
            return true

          node = updatedNode
          bindAttrs(updatedNode)
          return true
        },
        ignoreMutation: (mutation) => {
          if (!dom || !contentDOM) return true

          if ((mutation.type as unknown) === 'selection') return false

          if (contentDOM === mutation.target && mutation.type === 'attributes')
            return true

          if (contentDOM.contains(mutation.target)) return false

          return true
        },
        selectNode: () => {
          selected.value = true
        },
        deselectNode: () => {
          selected.value = false
        },
        destroy: () => {
          alive = false
          restores.remove(dom)
          release(view)
          disposeSelectedWatcher()
          app.unmount()
          dom.remove()
          contentDOM.remove()
        },
      }
    }
  }
)

// Same supported lifecycle as the existing table adapter; before create().
export async function installListInteraction(editor: Editor) {
  await editor.remove(listItemBlockView);
  editor.use(guardedListItemView);
}
