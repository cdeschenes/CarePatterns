import PageHeader from '@/components/layout/PageHeader'
import ItemForm from '@/components/items/ItemForm'

export default function ItemNew() {
  return (
    <div>
      <PageHeader title="New Item" showBack />
      <ItemForm />
    </div>
  )
}
